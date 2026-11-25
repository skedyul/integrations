import type {
  WebhookDefinition,
  WebhookHandler,
  WebhookRenewHandler,
  WebhookResponse,
} from 'skedyul'
import { isRuntimeWebhookContext } from 'skedyul'
import type { GoogleCalendarRecord } from '../events/types'
import {
  removeCalendarWatch,
  renewCalendarChannel,
  watchTokensMatch,
} from '../lib/calendar_link'
import { findCrmCalendarByWatchChannel, findCrmCalendarRecord } from '../lib/crm-calendars'
import { getAuthenticatedOAuthClient } from '../lib/google_client'
import type { GoogleInstallEnv } from '../lib/google_install_env'
import { startAppBatchOperation } from '../lib/start-app-batch-operation'
import { getHeaderValue } from './lib/helpers'

const registrationCalendarId = (registration: Record<string, unknown> | null | undefined) =>
  typeof registration?.calendar_id === 'string' ? registration.calendar_id : null

/** One incremental import for the calendar, after any import already running. */
const queueCalendarImport = (calendarId: string, label: string) =>
  startAppBatchOperation({
    operationHandle: 'import_calendar_events',
    entityHandle: 'calendar_event',
    label,
    input: { calendar_id: calendarId, use_sync_token: true },
    ifRunning: 'queue',
  })

const calendarPushHandler: WebhookHandler = async (request, context): Promise<WebhookResponse> => {
  if (!isRuntimeWebhookContext(context)) {
    console.error('[Google] calendar_push webhook requires install-scoped registration')
    return {
      status: 500,
      body: { error: 'This webhook requires a runtime context with appInstallationId' },
    }
  }

  const channelId = getHeaderValue(request.headers, 'x-goog-channel-id')
  const channelToken = getHeaderValue(request.headers, 'x-goog-channel-token')
  const resourceState = getHeaderValue(request.headers, 'x-goog-resource-state')
  const resourceId = getHeaderValue(request.headers, 'x-goog-resource-id')

  if (!channelId) {
    return { status: 400, body: { error: 'Missing X-Goog-Channel-ID header' } }
  }

  // The registration (one per calendar) names the calendar; the channel id
  // and secret token prove the ping is for its current channel.
  const calendarId = registrationCalendarId(context.registration)
  const record = calendarId
    ? await findCrmCalendarRecord(calendarId)
    : await findCrmCalendarByWatchChannel(channelId)
  if (!record) {
    if (resourceState === 'sync') {
      // Google's handshake can arrive before the new channel is stored.
      return { status: 200, body: { ok: true, action: 'acknowledged' } }
    }
    console.warn(`[Google Webhook] Unknown push channel ${channelId}`)
    return { status: 404, body: { error: 'Unknown push channel' } }
  }

  if (record.watch_channel_id !== channelId) {
    // The channel this replaced can still ping until Google stops it.
    return { status: 200, body: { ok: true, action: 'ignored', reason: 'stale_channel' } }
  }

  if (!watchTokensMatch(record.watch_token, channelToken)) {
    console.warn(`[Google Webhook] Channel token mismatch for ${channelId}`)
    return { status: 403, body: { error: 'Invalid channel token' } }
  }

  if (resourceId && record.watch_resource_id && resourceId !== record.watch_resource_id) {
    console.warn(`[Google Webhook] Resource id mismatch for ${channelId}`)
    return { status: 403, body: { error: 'Invalid channel resource' } }
  }

  if (resourceState === 'sync') {
    return { status: 200, body: { ok: true, action: 'acknowledged' } }
  }

  if (record.sync_enabled === false) {
    await stopChannelForDisabledSync(record, context.env as GoogleInstallEnv)
    return { status: 200, body: { ok: true, action: 'ignored', reason: 'sync_disabled' } }
  }

  try {
    const started = await queueCalendarImport(record.calendar_id, `Push sync ${record.calendar_id}`)
    return {
      status: 200,
      body: {
        ok: true,
        action: started.status === 'queued' ? 'batch_queued' : 'batch_started',
        batchJobId: started.batchJobId,
      },
    }
  } catch (error) {
    console.error('[Google Webhook] calendar_push batch start failed:', error)
    return {
      status: 500,
      body: {
        error: error instanceof Error ? error.message : 'Failed to start calendar import',
      },
    }
  }
}

/** Sync was turned off: stop the channel (best-effort) so Google stops pinging. */
async function stopChannelForDisabledSync(
  record: GoogleCalendarRecord,
  env: GoogleInstallEnv,
): Promise<void> {
  try {
    const { client } = await getAuthenticatedOAuthClient(env)
    await removeCalendarWatch(client, record)
  } catch (error) {
    console.warn(`[Google Webhook] Could not stop channel for ${record.calendar_id}:`, error)
  }
}

/**
 * Called by the platform shortly before the channel's registration expires.
 * Opens a new channel on the same URL, stops the old one, queues one
 * incremental import (covers anything a missed ping would have brought) and
 * returns the new expiry. A calendar that is gone or no longer syncing gives
 * up its registration instead. Token and rate-limit errors propagate: the
 * platform refreshes the token or retries with backoff.
 */
const renewCalendarPush: WebhookRenewHandler = async ({ registration, env }) => {
  const calendarId = registrationCalendarId(registration.context)
  if (!calendarId) return { delete: true }

  const record = await findCrmCalendarRecord(calendarId)
  if (!record || record.sync_enabled !== true) {
    if (record) {
      const { client } = await getAuthenticatedOAuthClient(env as GoogleInstallEnv)
      await removeCalendarWatch(client, record, { keepRegistration: true })
    }
    return { delete: true }
  }

  const { client } = await getAuthenticatedOAuthClient(env as GoogleInstallEnv)
  const next = await renewCalendarChannel(client, record, registration)

  try {
    await queueCalendarImport(calendarId, `Renewal sync ${calendarId}`)
  } catch (error) {
    console.warn(`[Google] Renewal sync for ${calendarId} not started:`, error)
  }

  return { expiresAt: next.watch_expiration ?? null }
}

export const calendarPushRegistry: WebhookDefinition = {
  name: 'calendar_push',
  description:
    'Receives Google Calendar push notifications for one calendar (one registration per calendar), validates the channel id and secret token against the CRM calendar row, and queues one incremental import_calendar_events batch job. The platform renews the channel before it expires through renew.',
  methods: ['POST'],
  type: 'WEBHOOK',
  handler: calendarPushHandler,
  renew: renewCalendarPush,
}
