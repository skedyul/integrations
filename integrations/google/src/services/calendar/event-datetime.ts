import type { calendar_v3 } from 'googleapis'

export type EventDateTimeInput = {
  start?: string
  end?: string
  timezone?: string
  all_day?: boolean
}

const DATE_ONLY = /^(\d{4}-\d{2}-\d{2})(?:$|T)/

/** Google requires a time zone on timed recurring events; used when none is known. */
export const RECURRING_EVENT_FALLBACK_TIMEZONE = 'UTC'
const COMPACT_UTC = /(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/

export class InvalidGoogleEventTimeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidGoogleEventTimeError'
  }
}

export function isDateOnlyValue(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim())
}

/**
 * Google recurring instance ids are `{masterId}_{stamp}`: the stamp is
 * `yyyyMMdd` for all-day series and `yyyyMMdd'T'HHmmss'Z'` (UTC) for timed ones.
 */
export function googleSeriesInstanceId(
  recurringEventId: string,
  originalStart: string,
  options?: { allDay?: boolean | null },
): string {
  const stamp = googleInstanceStamp(originalStart, options)
  if (!stamp) {
    throw new InvalidGoogleEventTimeError(
      `Cannot build Google instance id from original start "${originalStart}"`,
    )
  }
  return `${recurringEventId}_${stamp}`
}

const COMPACT_DATE = /^(\d{4})(\d{2})(\d{2})$/

/**
 * Instance stamp for `{masterId}_{stamp}`. Date-only original starts (the
 * platform stores all-day `original_start` as `YYYY-MM-DD`) and `allDay`
 * rows use the calendar date as written, never a UTC conversion.
 */
export function googleInstanceStamp(
  originalStart: string,
  options?: { allDay?: boolean | null },
): string | null {
  const trimmed = originalStart.trim()
  if (!trimmed) {
    return null
  }
  const compactDate = COMPACT_DATE.exec(trimmed)
  if (compactDate) {
    return trimmed
  }
  if (isDateOnlyValue(trimmed) || (options?.allDay === true && DATE_ONLY.test(trimmed))) {
    return trimmed.slice(0, 10).replaceAll('-', '')
  }
  return toCompactUtcStamp(trimmed)
}

/** Google this-and-following split masters end with `_RyyyyMMddTHHmmss` (optional Z). */
const GOOGLE_SPLIT_MASTER_ID = /_R\d{8}T\d{6}Z?$/i

export function isGoogleThisAndFollowingMasterId(eventId: string): boolean {
  return GOOGLE_SPLIT_MASTER_ID.test(eventId.trim())
}

/** CRM instance ids are not Google event ids; do not PATCH them as `{id}_{stamp}`. */
export function isSkedyulInstanceId(value: string): boolean {
  return value.trim().startsWith('ins_')
}

/** A Google event id, or undefined for blanks and CRM instance ids. */
export function asGoogleEventId(value?: string | null): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed || isSkedyulInstanceId(trimmed)) {
    return undefined
  }
  return trimmed
}

export function toCompactUtcStamp(value: string): string | null {
  const trimmed = value.trim()
  const compactMatch = trimmed.match(COMPACT_UTC)
  if (compactMatch) {
    return `${compactMatch[1]}${compactMatch[2]}${compactMatch[3]}T${compactMatch[4]}${compactMatch[5]}${compactMatch[6]}Z`
  }

  if (isDateOnlyValue(trimmed)) {
    // All-day instance ids carry the date only; see googleInstanceStamp.
    return trimmed.replaceAll('-', '')
  }

  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  const iso = parsed.toISOString()
  return `${iso.slice(0, 4)}${iso.slice(5, 7)}${iso.slice(8, 10)}T${iso.slice(11, 13)}${iso.slice(14, 16)}${iso.slice(17, 19)}Z`
}

function toNaiveLocalDateTime(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant)

  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? ''

  const year = get('year')
  const month = get('month')
  const day = get('day')
  const hour = get('hour')
  const minute = get('minute')
  const second = get('second')
  if (!year || !month || !day || hour === '' || minute === '' || second === '') {
    throw new InvalidGoogleEventTimeError(
      `Cannot format ${instant.toISOString()} in timezone ${timeZone}`,
    )
  }

  return `${year}-${month}-${day}T${hour}:${minute}:${second}`
}

function toRfc3339WithOffset(instant: Date): string {
  return instant.toISOString().replace(/\.000Z$/, 'Z')
}

/**
 * Which Google event a CRM row writes to: its stored id, the series instance
 * `{recurring_event_id}_{stamp}` for an exception, or a new insert.
 */
export function resolveGoogleWriteTarget(input: {
  google_event_id?: string | null
  event_id?: string | null
  recurring_event_id?: string | null
  original_start?: string | null
  all_day?: boolean | null
}): { mode: 'insert' } | { mode: 'patch'; eventId: string } {
  const storedId =
    asGoogleEventId(input.google_event_id) || asGoogleEventId(input.event_id)
  if (storedId && isGoogleThisAndFollowingMasterId(storedId)) {
    return { mode: 'patch', eventId: storedId }
  }

  const recurringEventId = asGoogleEventId(input.recurring_event_id)
  const originalStart = input.original_start?.trim()
  if (recurringEventId && originalStart) {
    if (isGoogleThisAndFollowingMasterId(recurringEventId)) {
      return { mode: 'patch', eventId: recurringEventId }
    }
    const instanceId = googleSeriesInstanceId(recurringEventId, originalStart, {
      allDay: input.all_day,
    })
    if (!storedId || storedId === recurringEventId) {
      return { mode: 'patch', eventId: instanceId }
    }
    return { mode: 'patch', eventId: storedId }
  }

  if (storedId) {
    return { mode: 'patch', eventId: storedId }
  }
  return { mode: 'insert' }
}

/**
 * Google EventDateTime: all-day uses `date`; timed events send either a naive
 * local dateTime + timeZone, or an RFC3339 timestamp with offset and no timeZone.
 * Sending both a Z/offset timestamp and timeZone yields "Invalid start time."
 */
export function buildEventDateTime(
  input: EventDateTimeInput,
  kind: 'start' | 'end',
): calendar_v3.Schema$EventDateTime | undefined {
  const value = kind === 'start' ? input.start : input.end
  if (!value) {
    return undefined
  }

  const trimmed = value.trim()
  if (input.all_day || (isDateOnlyValue(trimmed) && input.all_day !== false)) {
    const date = DATE_ONLY.exec(trimmed)?.[1] ?? trimmed.slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new InvalidGoogleEventTimeError(`Invalid all-day ${kind} "${value}"`)
    }
    return { date }
  }

  if (isDateOnlyValue(trimmed)) {
    return { date: trimmed }
  }

  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) {
    throw new InvalidGoogleEventTimeError(`Invalid ${kind} time "${value}"`)
  }

  const timezone = input.timezone?.trim()
  if (timezone) {
    return {
      dateTime: toNaiveLocalDateTime(parsed, timezone),
      timeZone: timezone,
    }
  }

  return { dateTime: toRfc3339WithOffset(parsed) }
}
