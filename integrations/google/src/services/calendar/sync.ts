import type { OAuth2Client } from 'google-auth-library'
import { instance } from 'skedyul'
import type {
  GoogleCalendarRecord,
  GoogleEventName,
  GoogleSyncDirection,
  GoogleSyncTrigger,
} from '../../events/types'
import { emitGoogleEvent } from '../../lib/emit-google-event'
import { listGoogleCalendarEvents } from './client'
import { normalizeGoogleCalendarEvent, resolveEventChangeType } from './normalize'

export interface CalendarSyncResult {
  eventsCreated: number
  eventsUpdated: number
  eventsDeleted: number
  nextSyncToken: string | null
}

export interface CalendarSyncOptions {
  auth: OAuth2Client
  appInstallationId: string
  calendarRecord: GoogleCalendarRecord
  direction?: GoogleSyncDirection
  trigger: GoogleSyncTrigger
  correlationId?: string
  timeMin?: string
  timeMax?: string
}

function shouldPull(direction: GoogleSyncDirection): boolean {
  return direction === 'pull' || direction === 'both'
}

async function updateCalendarRecord(
  recordId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  await instance.update('google_calendar', recordId, patch)
}

export async function syncGoogleCalendar(
  options: CalendarSyncOptions,
): Promise<CalendarSyncResult> {
  const direction = options.direction ?? options.calendarRecord.sync_direction ?? 'both'

  if (!shouldPull(direction)) {
    return {
      eventsCreated: 0,
      eventsUpdated: 0,
      eventsDeleted: 0,
      nextSyncToken: options.calendarRecord.sync_token ?? null,
    }
  }

  const correlationId =
    options.correlationId ?? `${options.calendarRecord.calendar_id}-${Date.now()}`

  let eventsCreated = 0
  let eventsUpdated = 0
  let eventsDeleted = 0
  let syncToken = options.calendarRecord.sync_token ?? undefined
  let nextSyncToken: string | null = options.calendarRecord.sync_token ?? null
  let pageToken: string | undefined

  try {
    do {
      const page = await listGoogleCalendarEvents(options.auth, {
        calendarId: options.calendarRecord.calendar_id,
        syncToken: syncToken || undefined,
        timeMin: syncToken ? undefined : options.timeMin,
        timeMax: syncToken ? undefined : options.timeMax,
        pageToken,
      })

      for (const googleEvent of page.events) {
        if (!googleEvent.id) {
          continue
        }

        const changeType = resolveEventChangeType(googleEvent)
        const eventName = (
          changeType === 'created'
            ? 'calendar.event.created'
            : changeType === 'deleted'
              ? 'calendar.event.deleted'
              : 'calendar.event.updated'
        ) satisfies GoogleEventName

        await emitGoogleEvent(
          options.appInstallationId,
          eventName,
          {
            calendar: {
              calendar_id: options.calendarRecord.calendar_id,
              summary: options.calendarRecord.summary || options.calendarRecord.calendar_id,
            },
            event: normalizeGoogleCalendarEvent(googleEvent),
            sync: {
              direction,
              trigger: options.trigger,
            },
          },
          `${correlationId}:${googleEvent.id}`,
          options.trigger,
        )

        if (changeType === 'created') {
          eventsCreated += 1
        } else if (changeType === 'deleted') {
          eventsDeleted += 1
        } else {
          eventsUpdated += 1
        }
      }

      pageToken = page.nextPageToken ?? undefined
      if (page.nextSyncToken) {
        nextSyncToken = page.nextSyncToken
      }
    } while (pageToken)
  } catch (error) {
    if (error instanceof Error && error.message === 'SYNC_TOKEN_INVALID') {
      return syncGoogleCalendar({
        ...options,
        calendarRecord: {
          ...options.calendarRecord,
          sync_token: null,
        },
      })
    }

    await emitGoogleEvent(
      options.appInstallationId,
      'calendar.sync.failed',
      {
        calendar: {
          calendar_id: options.calendarRecord.calendar_id,
          summary: options.calendarRecord.summary || options.calendarRecord.calendar_id,
        },
        sync: {
          direction,
          trigger: options.trigger,
          error: error instanceof Error ? error.message : String(error),
        },
      },
      correlationId,
      options.trigger,
    )

    throw error
  }

  await updateCalendarRecord(options.calendarRecord.id, {
    sync_token: nextSyncToken,
    last_synced_at: new Date().toISOString(),
  })

  await emitGoogleEvent(
    options.appInstallationId,
    'calendar.sync.completed',
    {
      calendar: {
        calendar_id: options.calendarRecord.calendar_id,
        summary: options.calendarRecord.summary || options.calendarRecord.calendar_id,
      },
      sync: {
        direction,
        trigger: options.trigger,
        events_created: eventsCreated,
        events_updated: eventsUpdated,
        events_deleted: eventsDeleted,
      },
    },
    correlationId,
    options.trigger,
  )

  return {
    eventsCreated,
    eventsUpdated,
    eventsDeleted,
    nextSyncToken,
  }
}

export async function loadGoogleCalendarRecord(
  calendarId: string,
): Promise<GoogleCalendarRecord | null> {
  const records = await instance.list('google_calendar', {
    filter: { calendar_id: calendarId },
    limit: 1,
  })

  const record = records.data[0] as GoogleCalendarRecord | undefined
  return record ?? null
}

export async function loadLinkedGoogleCalendars(): Promise<GoogleCalendarRecord[]> {
  const records = await instance.list('google_calendar', {
    filter: { sync_enabled: true },
    limit: 250,
  })

  return records.data as GoogleCalendarRecord[]
}

export async function loadGoogleCalendarRecordByWatchChannel(
  channelId: string,
): Promise<GoogleCalendarRecord | null> {
  const records = await instance.list('google_calendar', {
    filter: { watch_channel_id: channelId },
    limit: 1,
  })

  const record = records.data[0] as GoogleCalendarRecord | undefined
  return record ?? null
}
