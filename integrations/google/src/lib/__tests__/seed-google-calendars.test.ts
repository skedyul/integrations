import { describe, expect, it } from '@jest/globals'
import { toCalendarEntityPayload } from '../seed-google-calendars'

describe('toCalendarEntityPayload', () => {
  it('maps Google calendar list fields onto the CRM calendar entity', () => {
    expect(
      toCalendarEntityPayload({
        calendar_id: 'primary',
        summary: 'Work',
        primary: true,
        access_role: 'owner',
        time_zone: 'Australia/Sydney',
        description: 'Team calendar',
      }),
    ).toEqual({
      google_calendar_id: 'primary',
      summary: 'Work',
      primary: true,
      timezone: 'Australia/Sydney',
      description: 'Team calendar',
      sync_enabled: true,
      sync_direction: 'both',
    })
  })

  it('can write sync tokens onto the calendar CRM row', () => {
    expect(
      toCalendarEntityPayload(
        {
          calendar_id: 'primary',
          summary: 'Work',
          primary: true,
          access_role: 'owner',
          time_zone: null,
          description: null,
        },
        { sync_token: 'tok_1', last_synced_at: '2026-08-18T00:00:00.000Z' },
      ),
    ).toMatchObject({
      google_calendar_id: 'primary',
      sync_token: 'tok_1',
      last_synced_at: '2026-08-18T00:00:00.000Z',
    })
  })
})
