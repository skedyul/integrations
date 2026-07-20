import { describe, expect, it } from '@jest/globals'
import type { calendar_v3 } from 'googleapis'
import {
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
