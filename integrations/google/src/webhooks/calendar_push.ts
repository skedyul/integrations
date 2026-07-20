import type { WebhookDefinition, WebhookHandler, WebhookResponse } from 'skedyul'
import { isRuntimeWebhookContext } from 'skedyul'
import { ensureCalendarWatch } from '../lib/calendar_link'
import { getAuthenticatedOAuthClient } from '../lib/google_client'
import {
  loadGoogleCalendarRecordByWatchChannel,
  syncGoogleCalendar,
} from '../services/calendar/sync'
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
    const { client } = await getAuthenticatedOAuthClient(context.env)
    const watched = await ensureCalendarWatch(client, record)

    await syncGoogleCalendar({
      auth: client,
      appInstallationId: context.appInstallationId,
      calendarRecord: watched,
      trigger: 'push',
      correlationId: `${channelId}-${Date.now()}`,
    })

    return { status: 200, body: { ok: true, action: 'synced' } }
  } catch (error) {
    console.error('[Google Webhook] calendar_push sync failed:', error)
    return {
      status: 500,
      body: {
        error: error instanceof Error ? error.message : 'Sync failed',
      },
    }
  }
}

export const calendarPushRegistry: WebhookDefinition = {
  name: 'calendar_push',
  description: 'Receives Google Calendar push notifications and triggers incremental sync',
  methods: ['POST'],
  type: 'WEBHOOK',
  handler: calendarPushHandler,
}
