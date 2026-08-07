import type { WebhookDefinition, WebhookHandler, WebhookResponse } from 'skedyul'
import { isRuntimeWebhookContext } from 'skedyul'
import { ReaClient } from '../lib/rea-client'
import {
  buildEnquiryCreatedPayload,
  normalizeReaWebhookEvents,
} from '../lib/rea-enquiry'
import { createReaEvent } from '../lib/create-rea-event'
import { findActiveAgencyByOwnerId } from '../lib/reconcile-agencies'
import {
  REA_LEAD_EVENT_CATEGORY,
  REA_LEAD_EVENT_TYPE,
  type ReaClientEnv,
} from '../lib/rea-types'
import { parseReaEventPayload } from '../events/schemas'
import { parseJsonBody } from './lib/helpers'
import { verifyReaWebhookRequest } from './lib/verify-request'

const enquiryCreatedHandler: WebhookHandler = async (
  request,
  context,
): Promise<WebhookResponse> => {
  if (!isRuntimeWebhookContext(context)) {
    console.error('[REA] enquiry_created webhook requires install-scoped registration')
    return {
      status: 500,
      body: { error: 'This webhook requires a runtime context with appInstallationId' },
    }
  }

  const env = context.env as ReaClientEnv
  const verified = await verifyReaWebhookRequest(request, env, 'REA enquiry_created')
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
      webhookEvent.eventType !== REA_LEAD_EVENT_TYPE ||
      webhookEvent.eventCategory !== REA_LEAD_EVENT_CATEGORY
    ) {
      results.push({
        status: 'ignored',
        reason: 'unsupported_event',
        event_type: webhookEvent.eventType,
        event_id: webhookEvent.eventId,
      })
      continue
    }

    const agency = await findActiveAgencyByOwnerId(webhookEvent.ownerId)
    if (!agency) {
      console.log(
        `[REA] Ignoring enquiry for owner ${webhookEvent.ownerId} (no ACTIVE lead-capable agency)`,
      )
      results.push({
        status: 'ignored',
        reason: 'agency_not_connected',
        event_type: webhookEvent.eventType,
        event_id: webhookEvent.eventId,
        owner_id: webhookEvent.ownerId,
      })
      continue
    }

    let enquiry
    try {
      enquiry = await client.fetchEnquiry(webhookEvent.resourceUrl)
    } catch (error) {
      console.error(
        `[REA] Failed to fetch enquiry ${webhookEvent.resourceId}:`,
        error,
      )
      return {
        status: 500,
        body: {
          error: 'Failed to fetch enquiry',
          event_id: webhookEvent.eventId,
          resource_id: webhookEvent.resourceId,
        },
      }
    }

    const payload = buildEnquiryCreatedPayload({
      webhookEvent,
      agency: {
        agency_id: agency.agency_id,
        integration_id: agency.integration_id,
      },
      enquiry,
    })

    let validatedPayload
    try {
      validatedPayload = parseReaEventPayload('enquiry.created', payload)
    } catch (error) {
      console.error(
        `[REA] Invalid payload for enquiry.created (${webhookEvent.eventId}):`,
        error,
      )
      return {
        status: 400,
        body: {
          error: 'Invalid event payload',
          event_id: webhookEvent.eventId,
          owner_id: webhookEvent.ownerId,
        },
      }
    }

    try {
      const result = await createReaEvent('enquiry.created', validatedPayload, {
        correlationId: webhookEvent.eventId,
      })

      console.log(
        `[REA] Processed enquiry_created owner=${webhookEvent.ownerId} event_id=${webhookEvent.eventId} emitted=${result.emitted}`,
      )

      results.push({
        status: 'ok',
        app_event: 'enquiry.created',
        emitted: result.emitted,
        event_id: webhookEvent.eventId,
        owner_id: webhookEvent.ownerId,
        agency_id: agency.agency_id,
      })
    } catch (error) {
      console.error(
        `[REA] Failed to emit enquiry.created for ${webhookEvent.eventId}:`,
        error,
      )
      return {
        status: 500,
        body: {
          error: 'Failed to emit event',
          event_id: webhookEvent.eventId,
        },
      }
    }
  }

  return {
    status: 200,
    body: {
      status: 'ok',
      results,
    },
  }
}

export const enquiryCreatedWebhook: WebhookDefinition = {
  name: 'enquiry_created',
  description:
    'Receive REA EnquiryCreated lead webhooks for this workplace installation.',
  methods: ['POST'],
  type: 'WEBHOOK',
  handler: enquiryCreatedHandler,
}
