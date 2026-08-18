import { describe, expect, it } from '@jest/globals'
import calendar from '../calendar'
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
      'calendar_id',
    ])
    expect(calendarEventCrmMapDefaults.relationshipHandles?.calendar).toBe(
      'calendar',
    )
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
