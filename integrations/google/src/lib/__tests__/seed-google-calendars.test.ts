import { describe, expect, it } from '@jest/globals'
import type { GoogleCalendarSummary } from '../../services/calendar/client'
import {
  toCalendarEntityPayload,
  toCalendarImportPayload,
  toCalendarMetadataPayload,
  toCalendarWindowPullPayload,
} from '../seed-google-calendars'

const work: GoogleCalendarSummary = {
  calendar_id: 'primary',
  summary: 'Work',
  primary: true,
  access_role: 'owner',
  time_zone: 'Australia/Sydney',
  description: 'Team calendar',
  color: '#4A7FBF',
}

const room: GoogleCalendarSummary = {
  calendar_id: 'room@group.calendar.google.com',
  summary: 'Room 2015',
  primary: false,
  access_role: 'reader',
  time_zone: 'Pacific/Auckland',
  description: null,
  color: '#ffad46',
}

describe('toCalendarEntityPayload (first create)', () => {
  it('maps Google calendar list fields and default sync flags', () => {
    expect(toCalendarEntityPayload(work)).toEqual({
      google_calendar_id: 'primary',
      summary: 'Work',
      primary: true,
      timezone: 'Australia/Sydney',
      color: '#4A7FBF',
      description: 'Team calendar',
      sync_enabled: true,
      sync_direction: 'both',
    })
    expect(toCalendarEntityPayload(room)).toMatchObject({ sync_enabled: false })
  })

  it('keeps explicit flags and sync state from the record', () => {
    expect(
      toCalendarEntityPayload(work, {
        sync_enabled: false,
        sync_direction: 'pull',
        sync_token: 'tok_1',
        last_synced_at: '2026-08-18T00:00:00.000Z',
      }),
    ).toMatchObject({
      sync_enabled: false,
      sync_direction: 'pull',
      sync_token: 'tok_1',
      last_synced_at: '2026-08-18T00:00:00.000Z',
    })
  })
})

describe('toCalendarImportPayload', () => {
  it('only writes metadata for a calendar that already has a CRM row', () => {
    expect(toCalendarImportPayload(work, { exists: true })).toEqual(toCalendarMetadataPayload(work))
    expect(toCalendarImportPayload(work, { exists: true })).not.toHaveProperty('sync_enabled')
    expect(toCalendarImportPayload(work, { exists: false })).toMatchObject({
      sync_enabled: true,
      sync_direction: 'both',
    })
  })
})

describe('toCalendarWindowPullPayload', () => {
  it('never sets sync_enabled and sets sync_direction only on create', () => {
    expect(toCalendarWindowPullPayload(room)).toEqual({
      google_calendar_id: 'room@group.calendar.google.com',
      summary: 'Room 2015',
      primary: false,
      timezone: 'Pacific/Auckland',
      color: '#ffad46',
      description: null,
    })
    expect(toCalendarWindowPullPayload(room, { isNew: true })).toEqual({
      ...toCalendarMetadataPayload(room),
      sync_direction: 'both',
    })
  })
})
