import { describe, expect, it } from '@jest/globals'
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
