import type { WebhookDefinition, WebhookHandler, WebhookResponse } from 'skedyul'
import { isRuntimeWebhookContext } from 'skedyul'
import { ReaClient } from '../lib/rea-client'
import { normalizeReaWebhookEvents } from '../lib/rea-enquiry'
import {
  listAgencyRecords,
  revokeAgencyByOwnerId,
  syncConnectAgenciesSetupStep,
  upsertAgencyFromIntegration,
} from '../lib/reconcile-agencies'
import {
  REA_INTEGRATION_CREATED_EVENT_TYPE,
  REA_INTEGRATION_DELETED_EVENT_TYPE,
  REA_INTEGRATION_EVENT_CATEGORY,
  REA_INTEGRATION_UPDATED_EVENT_TYPE,
  type ReaClientEnv,
} from '../lib/rea-types'
import { parseJsonBody } from './lib/helpers'
import { verifyReaWebhookRequest } from './lib/verify-request'

const INTEGRATION_EVENT_TYPES: readonly string[] = [
  REA_INTEGRATION_CREATED_EVENT_TYPE,
  REA_INTEGRATION_UPDATED_EVENT_TYPE,
  REA_INTEGRATION_DELETED_EVENT_TYPE,
]

const integrationLifecycleHandler: WebhookHandler = async (
  request,
  context,
): Promise<WebhookResponse> => {
  if (!isRuntimeWebhookContext(context)) {
    console.error('[REA] rea_integration webhook requires install-scoped registration')
    return {
      status: 500,
      body: { error: 'This webhook requires a runtime context with appInstallationId' },
    }
  }

  const env = context.env as ReaClientEnv
  const verified = await verifyReaWebhookRequest(request, env, 'REA rea_integration')
  if (!verified.ok) {
    return { status: verified.status, body: verified.body }
  }

  const body = parseJsonBody(request)
  if (!body) {
    return { status: 200, body: { status: 'validated' } }
  }

  const events = normalizeReaWebhookEvents(body)
  if (events.length === 0) {
    return { status: 200, body: { status: 'validated' } }
  }

  const client = ReaClient.fromEnv(env)
  const results: Array<Record<string, unknown>> = []

  for (const webhookEvent of events) {
    if (
      webhookEvent.eventCategory !== REA_INTEGRATION_EVENT_CATEGORY ||
      !INTEGRATION_EVENT_TYPES.includes(webhookEvent.eventType)
    ) {
      results.push({
        status: 'ignored',
        reason: 'unsupported_event',
        event_type: webhookEvent.eventType,
        event_id: webhookEvent.eventId,
      })
      continue
    }

    try {
      if (webhookEvent.eventType === REA_INTEGRATION_DELETED_EVENT_TYPE) {
        const revoked = await revokeAgencyByOwnerId(webhookEvent.ownerId)
        results.push({
          status: 'ok',
          action: 'revoked',
          event_type: webhookEvent.eventType,
          event_id: webhookEvent.eventId,
          owner_id: webhookEvent.ownerId,
          agency_id: revoked?.agency_id ?? webhookEvent.ownerId,
        })
        continue
      }

      const integration = await client.fetchIntegration(webhookEvent.resourceUrl)
      const agency = await upsertAgencyFromIntegration(integration)

      results.push({
        status: 'ok',
        action: agency.status === 'ACTIVE' ? 'upserted' : 'revoked_no_lead_scope',
        event_type: webhookEvent.eventType,
        event_id: webhookEvent.eventId,
        owner_id: webhookEvent.ownerId,
        agency_id: agency.agency_id,
        agency_status: agency.status,
      })
    } catch (error) {
      console.error(
        `[REA] Failed to process ${webhookEvent.eventType} ${webhookEvent.eventId}:`,
        error,
      )
      return {
        status: 500,
        body: {
          error: 'Failed to process integration event',
          event_id: webhookEvent.eventId,
          event_type: webhookEvent.eventType,
        },
      }
    }
  }

  const agencies = await listAgencyRecords()
  const activeCount = agencies.filter(
    (agency) => agency.status === 'ACTIVE' && agency.has_lead_scope,
  ).length
  await syncConnectAgenciesSetupStep(activeCount)

  return {
    status: 200,
    body: {
      status: 'ok',
      active_count: activeCount,
      results,
    },
  }
}

export const reaIntegrationWebhook: WebhookDefinition = {
  name: 'rea_integration',
  description:
    'Receive REA IntegrationCreated/Updated/Deleted webhooks to sync authorized agencies.',
  methods: ['POST'],
  type: 'WEBHOOK',
  handler: integrationLifecycleHandler,
}
