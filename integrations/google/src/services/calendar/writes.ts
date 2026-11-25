import type { calendar_v3 } from 'googleapis'
import type { OAuth2Client } from 'google-auth-library'
import {
  isGoogleConflict,
  isGoogleNotFound,
  isGooglePreconditionFailed,
} from '../../lib/google-errors'
import {
  deleteGoogleCalendarEvent,
  getGoogleCalendarEvent,
  insertGoogleCalendarEvent,
  moveGoogleCalendarEvent,
  patchGoogleCalendarEvent,
  type GoogleCalendarEventInput,
} from './client'

type Sleep = (ms: number) => Promise<void>

const defaultSleep: Sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Insert with an optional client id. A 409 means an earlier attempt (or a
 * concurrent workflow) already created it: read it back instead of failing,
 * and restore it if it was cancelled.
 */
export async function insertEventIdempotent(
  auth: OAuth2Client,
  calendarId: string,
  input: GoogleCalendarEventInput,
  options: { eventId?: string },
): Promise<{ event: calendar_v3.Schema$Event; created: boolean }> {
  try {
    const event = await insertGoogleCalendarEvent(auth, calendarId, input, {
      eventId: options.eventId,
    })
    return { event, created: true }
  } catch (error) {
    if (!options.eventId || !isGoogleConflict(error)) {
      throw error
    }
  }

  const existing = await getGoogleCalendarEvent(auth, calendarId, options.eventId)
  if (existing.status === 'cancelled') {
    const restored = await patchGoogleCalendarEvent(auth, calendarId, options.eventId, {
      ...input,
      status: 'confirmed',
    })
    return { event: restored, created: false }
  }
  return { event: existing, created: false }
}

/**
 * PATCH with If-Match. On 412 the event changed in Google since our last
 * sync: re-GET it, re-apply the same field patch against the fresh etag and
 * retry once. The patch only carries fields changed in Skedyul, so other
 * Google-side edits survive.
 */
export async function patchEventWithEtag(
  auth: OAuth2Client,
  calendarId: string,
  eventId: string,
  input: GoogleCalendarEventInput,
  options: { etag?: string | null },
): Promise<calendar_v3.Schema$Event> {
  try {
    return await patchGoogleCalendarEvent(auth, calendarId, eventId, input, {
      ifMatch: options.etag ?? null,
    })
  } catch (error) {
    if (!options.etag || !isGooglePreconditionFailed(error)) {
      throw error
    }
  }

  const fresh = await getGoogleCalendarEvent(auth, calendarId, eventId)
  return patchGoogleCalendarEvent(auth, calendarId, eventId, input, {
    ifMatch: fresh.etag ?? null,
  })
}

export const INSTANCE_PATCH_RETRY_DELAYS_MS = [1_500, 3_000]

/**
 * PATCH one occurrence `{seriesId}_{stamp}`. The series write (insert of a
 * new series, or a master time change) can still be in flight from a sibling
 * workflow, so 404s are retried a bounded number of times. Returns null when
 * the target is a cancellation and the occurrence is already gone.
 */
export async function patchSeriesInstance(
  auth: OAuth2Client,
  calendarId: string,
  instanceId: string,
  input: GoogleCalendarEventInput,
  options?: { retryDelaysMs?: number[]; sleep?: Sleep },
): Promise<calendar_v3.Schema$Event | null> {
  const delays = options?.retryDelaysMs ?? INSTANCE_PATCH_RETRY_DELAYS_MS
  const sleep = options?.sleep ?? defaultSleep
  const body: GoogleCalendarEventInput = { ...input, recurrence: undefined }

  for (let attempt = 0; ; attempt += 1) {
    try {
      return await patchGoogleCalendarEvent(auth, calendarId, instanceId, body)
    } catch (error) {
      if (!isGoogleNotFound(error)) {
        throw error
      }
      if (input.status === 'cancelled') {
        return null
      }
      const delay = delays[attempt]
      if (delay === undefined) {
        throw error
      }
      await sleep(delay)
    }
  }
}

/** events.move then return the moved event (Google keeps the id). */
export async function moveEvent(
  auth: OAuth2Client,
  fromCalendarId: string,
  eventId: string,
  toCalendarId: string,
  sendUpdates?: GoogleCalendarEventInput['send_updates'],
): Promise<calendar_v3.Schema$Event> {
  return moveGoogleCalendarEvent(auth, fromCalendarId, eventId, toCalendarId, sendUpdates)
}

/** Delete; 404/410 mean it is already gone, which is success. */
export async function deleteEventIdempotent(
  auth: OAuth2Client,
  calendarId: string,
  eventId: string,
  sendUpdates?: GoogleCalendarEventInput['send_updates'],
): Promise<{ alreadyDeleted: boolean }> {
  try {
    await deleteGoogleCalendarEvent(auth, calendarId, eventId, { sendUpdates })
    return { alreadyDeleted: false }
  } catch (error) {
    if (isGoogleNotFound(error)) {
      return { alreadyDeleted: true }
    }
    throw error
  }
}
