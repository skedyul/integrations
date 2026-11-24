import type { WebhookDefinition, WebhookHandler, WebhookResponse } from 'skedyul'
import { isRuntimeWebhookContext } from 'skedyul'
import { watchTokensMatch } from '../lib/calendar_link'
import { findCrmCalendarByWatchChannel } from '../lib/crm-calendars'
import {
  StartAppBatchOperationError,
  startAppBatchOperation,
} from '../lib/start-app-batch-operation'
import { getHeaderValue } from './lib/helpers'

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

  // The channel, not a caller-supplied calendar id, identifies the calendar.
  const record = await findCrmCalendarByWatchChannel(channelId)
  if (!record) {
    if (resourceState === 'sync') {
      // Google's handshake can arrive before the new channel is stored.
      return { status: 200, body: { ok: true, action: 'acknowledged' } }
    }
    console.warn(`[Google Webhook] Unknown push channel ${channelId}`)
    return { status: 404, body: { error: 'Unknown push channel' } }
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
    return { status: 200, body: { ok: true, action: 'ignored', reason: 'sync_disabled' } }
  }

  try {
    const started = await startAppBatchOperation({
      operationHandle: 'import_calendar_events',
      entityHandle: 'calendar_event',
      label: `Push sync ${record.calendar_id}`,
      input: {
        calendar_id: record.calendar_id,
        use_sync_token: true,
      },
    })

    return {
      status: 200,
      body: { ok: true, action: 'batch_started', batchJobId: started.batchJobId },
    }
  } catch (error) {
    if (error instanceof StartAppBatchOperationError && error.code === 'CONFLICT') {
      return {
        status: 200,
        body: { ok: true, action: 'already_running' },
      }
    }

    console.error('[Google Webhook] calendar_push batch start failed:', error)
    return {
      status: 500,
      body: {
        error: error instanceof Error ? error.message : 'Failed to start calendar import',
      },
    }
  }
}

export const calendarPushRegistry: WebhookDefinition = {
  name: 'calendar_push',
  description:
    'Receives Google Calendar push notifications, validates the channel id and secret token against the CRM calendar row, and starts one incremental import_calendar_events batch job',
  methods: ['POST'],
  type: 'WEBHOOK',
  handler: calendarPushHandler,
}
