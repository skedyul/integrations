import { describe, expect, it } from '@jest/globals'
import {
  buildCalendarPeopleCascadeItems,
  eventAttendeeKey,
} from '../calendar-people'

describe('buildCalendarPeopleCascadeItems', () => {
  it('emits deduped users then attendees with __crmMatch placeholders', () => {
    const result = buildCalendarPeopleCascadeItems({
      googleEventId: 'evt_1',
      calendarId: 'cal_1',
      event: {
        google_event_id: 'evt_1',
        status: 'confirmed',
        summary: 'Standup',
        description: null,
        start: '2026-08-24T09:00:00.000Z',
        end: '2026-08-24T09:30:00.000Z',
        timezone: 'Australia/Sydney',
        all_day: false,
        recurrence: null,
        recurring_event_id: null,
        original_start: null,
        attendees: [
          {
            email: 'ada@example.com',
            display_name: 'Ada',
            response_status: 'accepted',
            organizer: true,
            optional: false,
            self: true,
          },
          {
            email: 'grace@example.com',
            display_name: 'Grace',
            response_status: 'needsAction',
          },
        ],
        organizer_email: 'ada@example.com',
        location: null,
        html_link: null,
        updated_at: null,
        etag: null,
      },
    })

    expect(result.users).toEqual([
      { user: { email: 'ada@example.com', display_name: 'Ada' } },
      { user: { email: 'grace@example.com', display_name: 'Grace' } },
    ])
    expect(result.attendees[0]).toEqual({
      attendee: {
        event_attendee_key: eventAttendeeKey('evt_1', 'ada@example.com'),
        email: 'ada@example.com',
        display_name: 'Ada',
        response_status: 'accepted',
        organizer: true,
        optional: false,
        self: true,
        event: { __crmMatch: 'evt_1' },
        user: { __crmMatch: 'ada@example.com' },
      },
      event: { __crmMatch: 'evt_1' },
      user: { __crmMatch: 'ada@example.com' },
    })
    expect(result.organizerMatch).toEqual({ __crmMatch: 'ada@example.com' })
  })
})
