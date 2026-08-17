import { describe, expect, it } from '@jest/globals'
import type { calendar_v3 } from 'googleapis'
import {
  classifyGoogleCalendarEvent,
  normalizeGoogleCalendarEvent,
  resolveEventChangeType,
} from '../normalize'

describe('normalizeGoogleCalendarEvent', () => {
  it('normalizes timed events', () => {
    const event: calendar_v3.Schema$Event = {
      id: 'evt_1',
      status: 'confirmed',
      summary: 'Meeting',
      description: 'Discuss roadmap',
      start: { dateTime: '2026-07-21T09:00:00+10:00', timeZone: 'Australia/Sydney' },
      end: { dateTime: '2026-07-21T10:00:00+10:00', timeZone: 'Australia/Sydney' },
      location: 'Office',
      htmlLink: 'https://calendar.google.com/event?eid=evt_1',
      updated: '2026-07-20T23:00:00.000Z',
      etag: '"etag-1"',
      attendees: [{ email: 'user@example.com', responseStatus: 'accepted' }],
    }

    expect(normalizeGoogleCalendarEvent(event)).toEqual({
      google_event_id: 'evt_1',
      status: 'confirmed',
      summary: 'Meeting',
      description: 'Discuss roadmap',
      start: '2026-07-21T09:00:00+10:00',
      end: '2026-07-21T10:00:00+10:00',
      timezone: 'Australia/Sydney',
      all_day: false,
      recurrence: null,
      recurring_event_id: null,
      original_start: null,
      attendees: [{ email: 'user@example.com', response_status: 'accepted' }],
      location: 'Office',
      html_link: 'https://calendar.google.com/event?eid=evt_1',
      updated_at: '2026-07-20T23:00:00.000Z',
      etag: '"etag-1"',
    })
  })

  it('normalizes all-day events', () => {
    const event: calendar_v3.Schema$Event = {
      id: 'evt_2',
      status: 'confirmed',
      summary: 'Holiday',
      start: { date: '2026-07-21' },
      end: { date: '2026-07-22' },
    }

    const normalized = normalizeGoogleCalendarEvent(event)
    expect(normalized.all_day).toBe(true)
    expect(normalized.start).toBe('2026-07-21')
    expect(normalized.end).toBe('2026-07-22')
  })

  it('normalizes series masters and exception overrides', () => {
    const master = normalizeGoogleCalendarEvent({
      id: 'abc123',
      status: 'confirmed',
      summary: 'Weekly standup',
      start: { dateTime: '2026-08-03T09:00:00.000Z' },
      end: { dateTime: '2026-08-03T10:00:00.000Z' },
      recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=MO'],
    })
    expect(master.recurrence).toEqual(['RRULE:FREQ=WEEKLY;BYDAY=MO'])
    expect(master.recurring_event_id).toBeNull()
    expect(classifyGoogleCalendarEvent(master)).toBe('series')

    const exception = normalizeGoogleCalendarEvent({
      id: 'abc123_20260817T090000Z',
      status: 'cancelled',
      recurringEventId: 'abc123',
      originalStartTime: { dateTime: '2026-08-17T09:00:00.000Z' },
      start: { dateTime: '2026-08-17T09:00:00.000Z' },
      end: { dateTime: '2026-08-17T10:00:00.000Z' },
    })
    expect(exception.recurring_event_id).toBe('abc123')
    expect(exception.original_start).toBe('2026-08-17T09:00:00.000Z')
    expect(exception.status).toBe('cancelled')
    expect(classifyGoogleCalendarEvent(exception)).toBe('exception')
  })
})

describe('resolveEventChangeType', () => {
  it('detects deleted events', () => {
    expect(resolveEventChangeType({ id: '1', status: 'cancelled' })).toBe('deleted')
  })

  it('detects created events', () => {
    expect(
      resolveEventChangeType({
        id: '1',
        status: 'confirmed',
        created: '2026-07-20T10:00:00.000Z',
        updated: '2026-07-20T10:00:00.000Z',
      }),
    ).toBe('created')
  })

  it('detects updated events', () => {
    expect(
      resolveEventChangeType({
        id: '1',
        status: 'confirmed',
        created: '2026-07-20T10:00:00.000Z',
        updated: '2026-07-20T11:00:00.000Z',
      }),
    ).toBe('updated')
  })
})
