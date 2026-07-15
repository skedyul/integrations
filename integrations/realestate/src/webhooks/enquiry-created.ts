import type { WebhookDefinition, WebhookHandler, WebhookResponse } from 'skedyul'
import { isRuntimeWebhookContext } from 'skedyul'
import { ReaClient } from '../lib/rea-client'
import {
  buildEnquiryCreatedPayload,
  normalizeReaWebhookEvents,
} from '../lib/rea-enquiry'
import { createReaEvent } from '../lib/create-rea-event'
import {
  cacheSigningKeys,
  getCachedSigningKeys,
  isSigningKeyCacheStale,
  verifyReaWebhookSignature,
} from '../lib/rea-webhook-signature'
import {
  REA_LEAD_EVENT_CATEGORY,
  REA_LEAD_EVENT_TYPE,
  type ReaClientEnv,
} from '../lib/rea-types'
import { parseReaEventPayload } from '../events/schemas'
import { getHeaderValue, getRawBodyString, parseJsonBody } from './lib/helpers'

async function loadSigningKeys(env: ReaClientEnv) {
  if (!isSigningKeyCacheStale()) {
    return
  }

  const client = ReaClient.fromEnv(env)
  const response = await client.getSigningKeys()
  cacheSigningKeys(response.keys ?? [])
}

const enquiryCreatedHandler: WebhookHandler = async (request, context): Promise<WebhookResponse> => {
  if (!isRuntimeWebhookContext(context)) {
    console.error('[REA] enquiry_created webhook requires install-scoped registration')
    return {
      status: 500,
      body: { error: 'This webhook requires a runtime context with appInstallationId' },
    }
  }

  const env = context.env as ReaClientEnv & {
    REA_AGENCY_ID?: string
    REA_INTEGRATION_ID?: string
  }
  const rawBody = getRawBodyString(request)
  const signatureHeader = getHeaderValue(request.headers, 'x-rea-signature')

  // REA validation handshake may omit signature/body — accept quickly.
  if (!signatureHeader?.trim()) {
    return { status: 200, body: { status: 'validated' } }
  }

  if (!env.REA_CLIENT_ID || !env.REA_CLIENT_SECRET) {
    console.error('[REA] enquiry_created webhook missing REA client credentials')
    return {
      status: 500,
      body: { error: 'REA client credentials not configured' },
    }
  }

  try {
    await loadSigningKeys(env)
  } catch (error) {
    console.error('[REA] Failed to load signing keys:', error)
    return {
      status: 500,
      body: { error: 'Failed to load REA signing keys' },
    }
  }

  let signingKeys = getCachedSigningKeys()
  let isValid = await verifyReaWebhookSignature({
    rawBody,
    signatureHeader,
    signingKeys,
  })

  if (!isValid) {
    try {
      const client = ReaClient.fromEnv(env)
      const response = await client.getSigningKeys()
      cacheSigningKeys(response.keys ?? [])
      signingKeys = response.keys ?? []

      isValid = await verifyReaWebhookSignature({
        rawBody,
        signatureHeader,
        signingKeys,
      })
    } catch (error) {
      console.error('[REA] Signature verification failed:', error)
    }
  }

  if (!isValid) {
    console.warn('[REA] Invalid enquiry_created webhook signature')
    return {
      status: 401,
      body: { error: 'Invalid webhook signature' },
    }
  }

  const body = parseJsonBody(request)
  if (!body) {
    return { status: 200, body: { status: 'validated' } }
  }

  const events = normalizeReaWebhookEvents(body)
  if (events.length === 0) {
    return { status: 200, body: { status: 'validated' } }
  }

  const expectedAgencyId = env.REA_AGENCY_ID?.trim().toUpperCase()
  const integrationId = env.REA_INTEGRATION_ID?.trim()

  if (!expectedAgencyId || !integrationId) {
    console.error('[REA] Install env missing REA_AGENCY_ID or REA_INTEGRATION_ID')
    return {
      status: 500,
      body: { error: 'Install configuration incomplete' },
    }
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

    if (webhookEvent.ownerId !== expectedAgencyId) {
      console.log(
        `[REA] Ignoring enquiry for owner ${webhookEvent.ownerId} (expected ${expectedAgencyId})`,
      )
      results.push({
        status: 'ignored',
        reason: 'owner_mismatch',
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
        agency_id: expectedAgencyId,
        integration_id: integrationId,
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
        agency_id: expectedAgencyId,
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
