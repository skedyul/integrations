import type { WebhookDefinition, WebhookHandler, WebhookResponse } from 'skedyul'
import { ReaClient } from '../lib/rea-client'
import {
  buildEnquiryCreatedPayload,
  normalizeReaWebhookEvents,
} from '../lib/rea-enquiry'
import { emitReaEvent } from '../lib/emit-rea-event'
import { resolveActiveAgencyForOwnerId } from '../lib/resolve-agency-for-owner'
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
  const env = context.env as ReaClientEnv
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

    let agency
    try {
      agency = await resolveActiveAgencyForOwnerId(webhookEvent.ownerId)
    } catch (error) {
      console.error(
        `[REA] Agency lookup failed for owner ${webhookEvent.ownerId}:`,
        error,
      )
      return {
        status: 500,
        body: {
          error: 'Failed to resolve agency',
          event_id: webhookEvent.eventId,
          owner_id: webhookEvent.ownerId,
        },
      }
    }

    if (!agency) {
      console.log(
        `[REA] No active agency for owner ${webhookEvent.ownerId}, ignoring ${webhookEvent.eventType}`,
      )
      results.push({
        status: 'ignored',
        reason: 'agency_not_linked',
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
      agency,
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
      const { emitted } = await emitReaEvent(
        agency.appInstallationId,
        'enquiry.created',
        validatedPayload,
        webhookEvent.eventId,
      )

      console.log(
        `[REA] Processed enquiry_created owner=${webhookEvent.ownerId} event_id=${webhookEvent.eventId} emitted=${emitted}`,
      )

      results.push({
        status: 'ok',
        app_event: 'enquiry.created',
        emitted,
        event_id: webhookEvent.eventId,
        owner_id: webhookEvent.ownerId,
        agency_id: agency.id,
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
    'Receive REA EnquiryCreated lead webhooks. Single provision-level endpoint for all linked agencies.',
  methods: ['POST'],
  type: 'WEBHOOK',
  handler: enquiryCreatedHandler,
}
