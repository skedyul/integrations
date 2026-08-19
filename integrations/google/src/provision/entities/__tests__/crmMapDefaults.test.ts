import { describe, expect, it } from '@jest/globals'
import calendar from '../calendar'
import calendarEvent from '../calendar-event'
import {
  calendarCrmMapDefaults,
  calendarEventCrmMapDefaults,
} from '../crmMapDefaults'

describe('crmMapDefaults', () => {
  it('suggests a calendar model match on google_calendar_id', () => {
    expect(calendarCrmMapDefaults.modelHandle).toBe('calendar')
    expect(calendarCrmMapDefaults.matchFieldHandle).toBe('google_calendar_id')
    expect(calendarCrmMapDefaults.fieldHandles.google_calendar_id).toBe(
      'google_calendar_id',
    )
    expect(calendarCrmMapDefaults.fieldHandles.sync_token).toBe('sync_token')
    expect(calendarCrmMapDefaults.fieldHandles.watch_channel_id).toBe(
      'watch_channel_id',
    )
  })

  it('suggests an event model with a calendar relationship', () => {
    expect(calendarEventCrmMapDefaults.modelHandle).toBe('event')
    expect(calendarEventCrmMapDefaults.matchFieldHandle).toBe('google_event_id')
    expect(calendarEventCrmMapDefaults.matchRuleEntityPaths).toEqual([
      'google_event_id',
    ])
    expect(calendarEventCrmMapDefaults.relationshipHandles?.calendar).toBe(
      'calendar',
    )
  })
})

describe('calendar event entity', () => {
  it('does not treat calendar_id as an upsert identity', () => {
    const calendarId = calendarEvent.fields.find((field) => field.handle === 'calendar_id')
    expect(calendarId?.isUnique).toBeUndefined()
    expect(calendarId?.required).toBe(true)
  })

  it('declares global iCal recurrence definitions', () => {
    const byHandle = Object.fromEntries(
      calendarEvent.fields.map((field) => [field.handle, field]),
    )
    expect(byHandle.recurrence).toMatchObject({
      type: 'object',
      definition: 'calendar/recurrence',
    })
    expect(byHandle.recurring_event_id).toMatchObject({
      definition: 'calendar/series_id',
    })
    expect(byHandle.original_start).toMatchObject({
      definition: 'calendar/original_start',
    })
  })
})

describe('calendar entity', () => {
  it('keeps sync and watch state on the CRM-mapped entity, not an internal model', () => {
    const handles = calendar.fields.map((field) => field.handle)
    expect(handles).toEqual(
      expect.arrayContaining([
        'google_calendar_id',
        'sync_enabled',
        'sync_token',
        'watch_channel_id',
        'watch_token',
        'last_synced_at',
      ]),
    )
  })
})
