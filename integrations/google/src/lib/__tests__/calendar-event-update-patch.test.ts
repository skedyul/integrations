import { describe, expect, it } from '@jest/globals'
import {
  attendeeEmails,
  buildCalendarEventCreateInput,
  buildCalendarEventUpdatePatch,
  calendarEventIds,
  unwrapSingleton,
  withCalendarId,
} from '../calendar-event-update-patch'

const after = {
  google_event_id: 'evt_1',
  calendar_id: 'cal_1',
  summary: 'Standup',
  description: 'Daily',
  location: 'Room A',
  start: '2026-08-24T09:00:00.000Z',
  end: '2026-08-24T09:30:00.000Z',
  timezone: 'Australia/Sydney',
  all_day: false,
  status: 'confirmed',
  attendees: [{ email: 'ada@example.com', response_status: 'accepted' }],
  recurrence: ['RRULE:FREQ=DAILY'],
  html_link: 'https://calendar.google.com/event?eid=evt_1',
  updated_at: '2026-08-24T08:00:00.000Z',
}

describe('buildCalendarEventUpdatePatch', () => {
  it('returns null when google ids are missing', () => {
    expect(
      buildCalendarEventUpdatePatch({}, { summary: 'Standup' }),
    ).toBeNull()
  })

  it('returns null when only identity or Google-owned metadata changed', () => {
    expect(
      buildCalendarEventUpdatePatch(after, {
        ...after,
        html_link: 'https://other',
        updated_at: '2026-08-24T09:00:00.000Z',
        etag: 'new',
      }),
    ).toBeNull()
  })

  it('patches summary, description, location, and status when those change', () => {
    expect(
      buildCalendarEventUpdatePatch(after, {
        ...after,
        summary: 'Planning',
        description: 'Weekly',
        location: 'Room B',
        status: 'tentative',
      }),
    ).toEqual({
      calendar_id: 'cal_1',
      event_id: 'evt_1',
      summary: 'Planning',
      description: 'Weekly',
      location: 'Room B',
      status: 'tentative',
    })
  })

  it('sends start, end, timezone, and all_day together when any time field changes', () => {
    expect(
      buildCalendarEventUpdatePatch(after, {
        ...after,
        start: '2026-08-24T10:00:00.000Z',
      }),
    ).toEqual({
      calendar_id: 'cal_1',
      event_id: 'evt_1',
      start: '2026-08-24T10:00:00.000Z',
      end: '2026-08-24T09:30:00.000Z',
      timezone: 'Australia/Sydney',
      all_day: false,
    })
  })

  it('normalizes attendee objects to emails and ignores unchanged attendee lists', () => {
    expect(
      buildCalendarEventUpdatePatch(after, {
        ...after,
        attendees: [{ email: 'ada@example.com' }],
      }),
    ).toBeNull()
    expect(
      buildCalendarEventUpdatePatch(after, {
        ...after,
        attendees: ['ada@example.com', 'grace@example.com'],
      }),
    ).toEqual({
      calendar_id: 'cal_1',
      event_id: 'evt_1',
      attendees: ['ada@example.com', 'grace@example.com'],
    })
  })

  it('patches recurrence when RRULE changes', () => {
    expect(
      buildCalendarEventUpdatePatch(after, {
        ...after,
        recurrence: ['RRULE:FREQ=WEEKLY'],
      }),
    ).toEqual({
      calendar_id: 'cal_1',
      event_id: 'evt_1',
      recurrence: ['RRULE:FREQ=WEEKLY'],
    })
  })

  it('keeps a single RRULE as an array instead of unwrapping it', () => {
    expect(
      buildCalendarEventUpdatePatch(after, {
        ...after,
        html_link: 'https://other',
      }),
    ).toBeNull()
  })

  it('unwraps singleton arrays from CRM field values', () => {
    expect(
      buildCalendarEventUpdatePatch(
        { google_event_id: ['evt_1'], calendar_id: ['cal_1'], summary: ['Standup'] },
        { google_event_id: ['evt_1'], calendar_id: ['cal_1'], summary: ['Planning'] },
      ),
    ).toEqual({
      calendar_id: 'cal_1',
      event_id: 'evt_1',
      summary: 'Planning',
    })
  })

  it('skips start and end when only the ISO serialization of the same instant changed', () => {
    expect(
      buildCalendarEventUpdatePatch(after, {
        ...after,
        start: '2026-08-24T09:00:00Z',
        end: '2026-08-24T09:30:00Z',
        html_link: 'https://other',
      }),
    ).toBeNull()
  })

  it('patches a series instance id when google_event_id is the master id', () => {
    expect(
      calendarEventIds({
        calendar_id: 'cal_1',
        google_event_id: 'abc123',
        recurring_event_id: 'abc123',
        original_start: '2026-08-17T09:00:00.000Z',
      }),
    ).toEqual({
      calendar_id: 'cal_1',
      event_id: 'abc123_20260817T090000Z',
    })
  })
})

describe('calendarEventIds', () => {
  it('reads google_event_id and calendar_id', () => {
    expect(calendarEventIds(after)).toEqual({
      calendar_id: 'cal_1',
      event_id: 'evt_1',
    })
  })

  it('does not treat a Skedyul instance id as a Google series id', () => {
    expect(
      calendarEventIds({
        calendar_id: 'cal_1',
        recurring_event_id: 'ins_hbu1u27jtrg4jmc3f95n9i60',
        original_start: '2026-08-28T01:00:00.000Z',
      }),
    ).toBeNull()
  })

  it('uses a fallback calendar id when the after payload has none', () => {
    expect(
      calendarEventIds({ google_event_id: 'evt_1', summary: 'Standup' }, 'cal_1'),
    ).toEqual({
      calendar_id: 'cal_1',
      event_id: 'evt_1',
    })
  })
})

describe('withCalendarId', () => {
  it('fills calendar_id when missing', () => {
    expect(withCalendarId({ summary: 'Standup' }, 'cal_1')).toEqual({
      summary: 'Standup',
      calendar_id: 'cal_1',
    })
  })
})

describe('buildCalendarEventCreateInput', () => {
  it('returns null without summary, start, end, or calendar', () => {
    expect(buildCalendarEventCreateInput({ summary: 'Add' })).toBeNull()
    expect(
      buildCalendarEventCreateInput(
        {
          summary: 'Add',
          start: '2026-08-28T18:30:00.000Z',
          end: '2026-08-28T20:00:00.000Z',
        },
      ),
    ).toBeNull()
  })

  it('builds an insert body from after fields and a fallback calendar id', () => {
    expect(
      buildCalendarEventCreateInput(
        {
          summary: 'Something',
          start: '2026-08-28T18:30:00.000Z',
          end: '2026-08-28T20:00:00.000Z',
          timezone: 'Australia/Melbourne',
          description: 'Notes',
        },
        'avin@skedyul.it',
      ),
    ).toEqual({
      calendar_id: 'avin@skedyul.it',
      summary: 'Something',
      start: '2026-08-28T18:30:00.000Z',
      end: '2026-08-28T20:00:00.000Z',
      timezone: 'Australia/Melbourne',
      description: 'Notes',
    })
  })
})

describe('attendeeEmails', () => {
  it('accepts strings or { email } objects', () => {
    expect(attendeeEmails(['ada@example.com', { email: 'grace@example.com' }])).toEqual([
      'ada@example.com',
      'grace@example.com',
    ])
  })
})

describe('unwrapSingleton', () => {
  it('unwraps nested one-item arrays', () => {
    expect(unwrapSingleton([['evt_1']])).toBe('evt_1')
  })
})
