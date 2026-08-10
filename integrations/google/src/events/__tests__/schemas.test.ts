import { describe, expect, it } from '@jest/globals'
import { parseGoogleEventPayload } from '../schemas'

describe('parseGoogleEventPayload', () => {
  it('parses calendar.event.created payloads', () => {
    const payload = parseGoogleEventPayload('calendar.event.created', {
      calendar: {
        calendar_id: 'primary',
        summary: 'Work',
      },
      event: {
        google_event_id: 'evt_1',
        status: 'confirmed',
        summary: 'Standup',
        description: null,
        start: '2026-07-21T09:00:00+10:00',
        end: '2026-07-21T09:30:00+10:00',
        timezone: 'Australia/Sydney',
        all_day: false,
        recurrence: null,
        attendees: [],
        location: null,
        html_link: null,
        updated_at: null,
        etag: null,
      },
      sync: {
        direction: 'pull',
        trigger: 'manual',
      },
    })

    expect(payload.calendar.calendar_id).toBe('primary')
    expect(payload.event.summary).toBe('Standup')
  })

  it('accepts attendee addresses that strict email validation would reject', () => {
    const payload = parseGoogleEventPayload('calendar.event.updated', {
      calendar: {
        calendar_id: 'primary',
        summary: 'Work',
      },
      event: {
        google_event_id: 'evt_2',
        status: 'confirmed',
        summary: 'All hands',
        description: null,
        start: '2026-07-21T09:00:00+10:00',
        end: '2026-07-21T09:30:00+10:00',
        timezone: 'Australia/Sydney',
        all_day: false,
        recurrence: null,
        attendees: [
          { email: 'room_a@resource.calendar.google.com', response_status: 'accepted' },
          { email: 'reception@intranet_local', response_status: null },
        ],
        location: null,
        html_link: null,
        updated_at: null,
        etag: null,
      },
      sync: {
        direction: 'pull',
        trigger: 'push',
      },
    })

    expect(payload.event.attendees).toHaveLength(2)
  })

  it('rejects an empty attendee email', () => {
    expect(() =>
      parseGoogleEventPayload('calendar.event.updated', {
        calendar: { calendar_id: 'primary', summary: 'Work' },
        event: {
          google_event_id: 'evt_3',
          status: 'confirmed',
          summary: null,
          description: null,
          start: null,
          end: null,
          timezone: null,
          all_day: false,
          recurrence: null,
          attendees: [{ email: '', response_status: null }],
          location: null,
          html_link: null,
          updated_at: null,
          etag: null,
        },
        sync: { direction: 'pull', trigger: 'push' },
      }),
    ).toThrow()
  })

  it('parses calendar.sync.completed payloads', () => {
    const payload = parseGoogleEventPayload('calendar.sync.completed', {
      calendar: {
        calendar_id: 'primary',
        summary: 'Work',
      },
      sync: {
        direction: 'both',
        trigger: 'push',
        events_created: 1,
        events_updated: 2,
        events_deleted: 0,
      },
    })

    expect(payload.sync.events_updated).toBe(2)
  })
})
