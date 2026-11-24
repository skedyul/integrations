/**
 * Build a calendar_event_update patch from unformatted CRM entity payloads.
 * Compares mapped Google fields and skips identity / Google-owned metadata.
 */

import type { GoogleCalendarEventInput } from '../services/calendar/client'
import {
  isDateOnlyValue,
  resolveGoogleWriteTarget,
} from '../services/calendar/event-datetime'

export type CalendarEventUpdatePatch = GoogleCalendarEventInput & {
  calendar_id: string
  event_id: string
  recurring_event_id?: string
  original_start?: string
}

export type CalendarEventCreateBody = GoogleCalendarEventInput & {
  calendar_id: string
}

const SCALAR_KEYS = ['summary', 'description', 'location', 'status'] as const

export function unwrapSingleton(value: unknown): unknown {
  if (Array.isArray(value) && value.length === 1) {
    return unwrapSingleton(value[0])
  }
  return value
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  const unwrapped = unwrapSingleton(value)
  if (unwrapped != null && typeof unwrapped === 'object' && !Array.isArray(unwrapped)) {
    return unwrapped as Record<string, unknown>
  }
  return null
}

export function asString(value: unknown): string | undefined {
  const unwrapped = unwrapSingleton(value)
  if (typeof unwrapped === 'string' && unwrapped.trim() !== '') {
    return unwrapped
  }
  if (typeof unwrapped === 'number' && Number.isFinite(unwrapped)) {
    return String(unwrapped)
  }
  return undefined
}

/** Workflow simple-refs preserve JSON null; Zod string().optional() rejects it. */
export function blankToUndefined(value: unknown): unknown {
  if (value == null || value === '') {
    return undefined
  }
  return value
}

export function asBoolean(value: unknown): boolean | undefined {
  const unwrapped = unwrapSingleton(value)
  if (typeof unwrapped === 'boolean') {
    return unwrapped
  }
  if (unwrapped === 'true') {
    return true
  }
  if (unwrapped === 'false') {
    return false
  }
  return undefined
}

export function attendeeEmails(value: unknown): string[] | undefined {
  const unwrapped = unwrapSingleton(value)
  if (unwrapped == null || unwrapped === '') {
    return undefined
  }
  const list = Array.isArray(unwrapped) ? unwrapped : [unwrapped]
  const emails = list
    .map((entry) => {
      if (typeof entry === 'string') {
        return entry.trim()
      }
      if (entry && typeof entry === 'object' && 'email' in entry) {
        const email = (entry as { email?: unknown }).email
        return typeof email === 'string' ? email.trim() : ''
      }
      return ''
    })
    .filter((email) => email.length > 0)
  return emails.length > 0 ? emails : undefined
}

function isBlank(value: unknown): boolean {
  if (value == null || value === '') {
    return true
  }
  if (Array.isArray(value) && value.length === 0) {
    return true
  }
  return false
}

function jsonKey(value: unknown): string {
  if (isBlank(value)) {
    return ''
  }
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function readField(
  record: Record<string, unknown> | null | undefined,
  key: string,
): unknown {
  if (!record) {
    return undefined
  }
  return unwrapSingleton(record[key])
}

function asStringArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    if (value.length === 1 && Array.isArray(value[0])) {
      return asStringArray(value[0])
    }
    return value.map((item) => String(item))
  }
  return undefined
}

/**
 * Recurrence lines (RRULE/EXRULE/RDATE/EXDATE, parameterised lines included)
 * from a CRM value: an array, a JSON array string, or newline-separated text.
 * Lines are passed to Google verbatim. Returns undefined when there are none.
 */
export function parseRecurrenceLines(value: unknown): string[] | undefined {
  let source: unknown = value
  if (typeof source === 'string') {
    const trimmed = source.trim()
    if (!trimmed) return undefined
    if (trimmed.startsWith('[')) {
      try {
        source = JSON.parse(trimmed)
      } catch {
        return undefined
      }
    } else {
      source = trimmed.split(/\r?\n/)
    }
  }
  const lines = asStringArray(source)
    ?.map((line) => line.trim())
    .filter((line) => line.length > 0 && line !== 'null')
  return lines && lines.length > 0 ? lines : undefined
}

function valuesChanged(before: unknown, after: unknown): boolean {
  return jsonKey(before) !== jsonKey(after)
}

function instantsEqual(before: unknown, after: unknown): boolean {
  const left = asString(before)
  const right = asString(after)
  if (!left && !right) {
    return true
  }
  if (!left || !right) {
    return false
  }
  if (isDateOnlyValue(left) || isDateOnlyValue(right)) {
    return left.slice(0, 10) === right.slice(0, 10)
  }
  const leftDate = new Date(left)
  const rightDate = new Date(right)
  if (Number.isNaN(leftDate.getTime()) || Number.isNaN(rightDate.getTime())) {
    return left === right
  }
  return leftDate.getTime() === rightDate.getTime()
}

function isTruthyBoolean(value: unknown): boolean {
  return asBoolean(value) === true
}

export function resolveGoogleEventId(record: Record<string, unknown>): string | undefined {
  const target = resolveGoogleWriteTarget({
    google_event_id: asString(record.google_event_id),
    event_id: asString(record.event_id),
    recurring_event_id: asString(record.recurring_event_id),
    original_start: asString(record.original_start),
    all_day: asBoolean(record.all_day),
  })
  return target.mode === 'patch' ? target.eventId : undefined
}

export function calendarEventIds(
  after: unknown,
  fallbackCalendarId?: string,
): { calendar_id: string; event_id: string } | null {
  const record = asRecord(after)
  if (!record) {
    return null
  }
  const calendarId = asString(record.calendar_id) ?? asString(fallbackCalendarId)
  const eventId = resolveGoogleEventId(record)
  if (!calendarId || !eventId) {
    return null
  }
  return { calendar_id: calendarId, event_id: eventId }
}

export function withCalendarId(
  record: Record<string, unknown> | null,
  calendarId: string | undefined,
): Record<string, unknown> | null {
  if (!record) {
    return null
  }
  if (asString(record.calendar_id) || !asString(calendarId)) {
    return record
  }
  return { ...record, calendar_id: calendarId }
}

/**
 * Full Google insert body from an unformatted CRM calendar_event snapshot.
 * Used when the workplace row has no Google event id yet.
 */
export function buildCalendarEventCreateInput(
  after: unknown,
  fallbackCalendarId?: string,
): CalendarEventCreateBody | null {
  const afterRecord = asRecord(after) ?? parseJsonRecord(after)
  if (!afterRecord) {
    return null
  }
  const calendarId = asString(afterRecord.calendar_id) ?? asString(fallbackCalendarId)
  const summary = asString(afterRecord.summary)
  const start = asString(afterRecord.start)
  const end = asString(afterRecord.end)
  if (!calendarId || !summary || !start || !end) {
    return null
  }

  const created: CalendarEventCreateBody = {
    calendar_id: calendarId,
    summary,
    start,
    end,
  }
  const description = asString(afterRecord.description)
  if (description) {
    created.description = description
  }
  const location = asString(afterRecord.location)
  if (location) {
    created.location = location
  }
  const timezone = asString(afterRecord.timezone)
  if (timezone) {
    created.timezone = timezone
  }
  const allDay = asBoolean(afterRecord.all_day)
  if (allDay != null) {
    created.all_day = allDay
  }
  const attendees = attendeeEmails(afterRecord.attendees)
  if (attendees) {
    created.attendees = attendees
  }
  const recurrence = parseRecurrenceLines(afterRecord.recurrence)
  if (recurrence) {
    created.recurrence = recurrence
  }
  const status = asString(afterRecord.status)
  if (status === 'cancelled' || status === 'tentative') {
    created.status = status
  }
  return created
}

/** recurring_event_id + original_start: an exception of a series. */
export function isSeriesException(record: Record<string, unknown> | null): boolean {
  if (!record) return false
  return Boolean(asString(record.recurring_event_id) && asString(record.original_start))
}

/**
 * The exception now belongs to another series slot: its series changed (a
 * "this and following" split re-points it at the new series) or its
 * original start moved (an "all events" time change). The old Google
 * instance is gone, so the full edit must be applied to the new instance.
 */
export function seriesLinkChanged(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): boolean {
  if (!before || !after) return false
  const beforeSeries = asString(readField(before, 'recurring_event_id')) ?? ''
  const afterSeries = asString(readField(after, 'recurring_event_id')) ?? ''
  if (beforeSeries !== afterSeries) {
    return true
  }
  return !instantsEqual(readField(before, 'original_start'), readField(after, 'original_start'))
}

/**
 * Every writable field of an exception row, for a PATCH of its Google
 * instance. Blank fields are omitted (the instance keeps the series value).
 */
export function buildCalendarEventFullBody(record: Record<string, unknown>): GoogleCalendarEventInput {
  const body: GoogleCalendarEventInput = {}
  for (const key of SCALAR_KEYS) {
    const value = asString(readField(record, key))
    if (value) {
      body[key] = value
    }
  }
  const start = asString(record.start)
  if (start) body.start = start
  const end = asString(record.end)
  if (end) body.end = end
  const timezone = asString(record.timezone)
  if (timezone) body.timezone = timezone
  const allDay = asBoolean(record.all_day)
  if (allDay != null) body.all_day = allDay
  const attendees = attendeeEmails(record.attendees)
  if (attendees) body.attendees = attendees
  return body
}

export function parseJsonRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === 'string') {
    try {
      return asRecord(JSON.parse(value))
    } catch {
      return null
    }
  }
  return asRecord(value)
}

/**
 * Diff unformatted calendar_event payloads into a Google events.patch body.
 * Returns null when ids are missing or no mapped writable field changed.
 */
export function buildCalendarEventUpdatePatch(
  before: unknown,
  after: unknown,
): CalendarEventUpdatePatch | null {
  const afterRecord = asRecord(after) ?? parseJsonRecord(after)
  const ids = calendarEventIds(afterRecord)
  if (!afterRecord || !ids) {
    return null
  }

  const beforeRecord = asRecord(before) ?? parseJsonRecord(before)
  const patch: CalendarEventUpdatePatch = {
    calendar_id: ids.calendar_id,
    event_id: ids.event_id,
  }
  let hasField = false

  for (const key of SCALAR_KEYS) {
    const next = readField(afterRecord, key)
    if (isBlank(next)) {
      // Cleared in Skedyul: send '' so Google clears it too (status has no
      // empty value).
      if (key !== 'status' && beforeRecord && !isBlank(readField(beforeRecord, key))) {
        patch[key] = ''
        hasField = true
      }
      continue
    }
    if (!valuesChanged(readField(beforeRecord, key), next)) {
      continue
    }
    const nextString = asString(next)
    if (!nextString) {
      continue
    }
    patch[key] = nextString
    hasField = true
  }

  const timeChanged =
    !instantsEqual(readField(beforeRecord, 'start'), readField(afterRecord, 'start')) ||
    !instantsEqual(readField(beforeRecord, 'end'), readField(afterRecord, 'end')) ||
    (asString(readField(beforeRecord, 'timezone')) ?? '') !==
      (asString(readField(afterRecord, 'timezone')) ?? '') ||
    isTruthyBoolean(readField(beforeRecord, 'all_day')) !==
      isTruthyBoolean(readField(afterRecord, 'all_day'))
  if (timeChanged) {
    const start = asString(afterRecord.start)
    const end = asString(afterRecord.end)
    const timezone = asString(afterRecord.timezone)
    const allDay = asBoolean(afterRecord.all_day)
    if (start) {
      patch.start = start
    }
    if (end) {
      patch.end = end
    }
    if (timezone) {
      patch.timezone = timezone
    }
    if (allDay != null) {
      patch.all_day = allDay
    }
    if (start || end || timezone || allDay != null) {
      hasField = true
    }
  }

  const nextAttendees = attendeeEmails(afterRecord.attendees)
  const prevAttendees = attendeeEmails(beforeRecord?.attendees)
  if (
    nextAttendees &&
    jsonKey([...nextAttendees].sort()) !== jsonKey([...(prevAttendees ?? [])].sort())
  ) {
    patch.attendees = nextAttendees
    hasField = true
  } else if (!nextAttendees && prevAttendees && beforeRecord) {
    patch.attendees = []
    hasField = true
  }

  const nextRecurrence = parseRecurrenceLines(afterRecord.recurrence)
  const prevRecurrence = parseRecurrenceLines(beforeRecord?.recurrence)
  if (nextRecurrence && jsonKey(nextRecurrence) !== jsonKey(prevRecurrence ?? [])) {
    patch.recurrence = nextRecurrence
    hasField = true
  } else if (!nextRecurrence && prevRecurrence && beforeRecord) {
    patch.recurrence = []
    hasField = true
  }

  return hasField ? patch : null
}
