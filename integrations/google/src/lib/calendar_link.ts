import { webhook } from 'skedyul'
import type { OAuth2Client } from 'google-auth-library'
import type { GoogleCalendarRecord } from '../events/types'
import {
  startCalendarWatch,
  stopCalendarWatch,
  watchNeedsRenewal,
} from '../services/calendar/watch'

const CALENDAR_PUSH_WEBHOOK_NAME = 'calendar_push'

export async function ensureInstallCalendarPushWebhook(): Promise<string> {
  const listResult = await webhook.list({ name: CALENDAR_PUSH_WEBHOOK_NAME })
  if (listResult.webhooks.length > 0) {
    return listResult.webhooks[0].url
  }

  const created = await webhook.create(CALENDAR_PUSH_WEBHOOK_NAME)
  return created.url
}

/**
 * Register a Google push channel. The channel token is the Google calendar id
 * so calendar_push can start an import without reading CRM or an internal model.
 */
export async function ensureCalendarWatch(
  auth: OAuth2Client,
  record: GoogleCalendarRecord,
): Promise<GoogleCalendarRecord> {
  const webhookUrl = await ensureInstallCalendarPushWebhook()

  if (
    record.watch_channel_id &&
    record.watch_resource_id &&
    record.watch_token &&
    !watchNeedsRenewal(record.watch_expiration)
  ) {
    return record
  }

  if (record.watch_channel_id && record.watch_resource_id) {
    await stopCalendarWatch(auth, {
      channelId: record.watch_channel_id,
      resourceId: record.watch_resource_id,
    })
  }

  const watch = await startCalendarWatch(auth, {
    calendarId: record.calendar_id,
    webhookUrl,
    token: record.calendar_id,
  })

  return {
    ...record,
    watch_channel_id: watch.channelId,
    watch_resource_id: watch.resourceId,
    watch_expiration: watch.expiration,
    watch_token: watch.token,
  }
}

export async function removeCalendarWatch(
  auth: OAuth2Client,
  record: GoogleCalendarRecord,
): Promise<void> {
  if (record.watch_channel_id && record.watch_resource_id) {
    await stopCalendarWatch(auth, {
      channelId: record.watch_channel_id,
      resourceId: record.watch_resource_id,
    })
  }
}

export function assertCalendarWritable(record: GoogleCalendarRecord): void {
  if (record.external_read_only) {
    throw new Error('This calendar is configured as external read-only')
  }
}
