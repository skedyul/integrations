import { describe, expect, it } from '@jest/globals'
import {
  toCalendarEntityPayload,
  toCalendarWindowPullPayload,
} from '../seed-google-calendars'

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
        color: '#4A7FBF',
      }),
    ).toEqual({
      google_calendar_id: 'primary',
      summary: 'Work',
      primary: true,
      timezone: 'Australia/Sydney',
      color: '#4A7FBF',
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
          color: null,
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

describe('toCalendarWindowPullPayload', () => {
  it('omits sync_enabled so existing CRM flags are not reset', () => {
    expect(
      toCalendarWindowPullPayload({
        calendar_id: 'room@group.calendar.google.com',
        summary: 'Room 2015',
        primary: false,
        access_role: 'reader',
        time_zone: 'Pacific/Auckland',
        description: null,
        color: '#ffad46',
      }),
    ).toEqual({
      google_calendar_id: 'room@group.calendar.google.com',
      summary: 'Room 2015',
      primary: false,
      timezone: 'Pacific/Auckland',
      color: '#ffad46',
      description: null,
      sync_direction: 'both',
    })
  })
})
