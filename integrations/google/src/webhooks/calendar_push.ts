import type { WebhookDefinition, WebhookHandler, WebhookResponse } from 'skedyul'
import { isRuntimeWebhookContext } from 'skedyul'
import {
  StartAppBatchOperationError,
  startAppBatchOperation,
} from '../lib/start-app-batch-operation'
import { loadGoogleCalendarRecordByWatchChannel } from '../services/calendar/sync'
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
  const resourceState = getHeaderValue(request.headers, 'x-goog-resource-state')
  const channelToken = getHeaderValue(request.headers, 'x-goog-channel-token')

  if (!channelId) {
    return { status: 400, body: { error: 'Missing X-Goog-Channel-ID header' } }
  }

  const record = await loadGoogleCalendarRecordByWatchChannel(channelId)
  if (!record) {
    console.warn(`[Google Webhook] No calendar record found for channel ${channelId}`)
    return { status: 404, body: { error: 'Unknown calendar watch channel' } }
  }

  if (record.watch_token && channelToken !== record.watch_token) {
    return { status: 401, body: { error: 'Invalid watch channel token' } }
  }

  if (resourceState === 'sync') {
    return { status: 200, body: { ok: true, action: 'acknowledged' } }
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
    'Receives Google Calendar push notifications and starts one import_calendar_events batch job',
  methods: ['POST'],
  type: 'WEBHOOK',
  handler: calendarPushHandler,
}
