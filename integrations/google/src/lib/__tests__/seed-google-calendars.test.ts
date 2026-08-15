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
    })
  })
})
