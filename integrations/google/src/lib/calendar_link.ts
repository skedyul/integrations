import { webhook } from 'skedyul'
import type { OAuth2Client } from 'google-auth-library'
import { instance } from 'skedyul'
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
  })

  await instance.update('google_calendar', record.id, {
    watch_channel_id: watch.channelId,
    watch_resource_id: watch.resourceId,
    watch_expiration: watch.expiration,
    watch_token: watch.token,
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

  await instance.update('google_calendar', record.id, {
    watch_channel_id: null,
    watch_resource_id: null,
    watch_expiration: null,
    watch_token: null,
    sync_enabled: false,
  })
}

export function assertCalendarWritable(record: GoogleCalendarRecord): void {
  if (record.external_read_only) {
    throw new Error('This calendar is configured as external read-only')
  }
}
