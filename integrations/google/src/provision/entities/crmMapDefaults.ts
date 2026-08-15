/**
 * Suggested CRM map defaults for Google Calendar entities.
 * Consumed generically by core install UI via entity.crmMapDefaults.
 */

import type { EntityCrmMapDefaults } from 'skedyul'

export const calendarCrmMapDefaults: EntityCrmMapDefaults = {
  modelHandle: 'calendar',
  matchFieldHandle: 'google_calendar_id',
  matchRuleEntityPaths: ['google_calendar_id'],
  fieldHandles: {
    google_calendar_id: 'google_calendar_id',
    summary: 'name',
    primary: 'primary',
    timezone: 'timezone',
    description: 'description',
  },
}

export const calendarEventCrmMapDefaults: EntityCrmMapDefaults = {
  modelHandle: 'event',
  matchFieldHandle: 'google_event_id',
  matchRuleEntityPaths: ['google_event_id', 'calendar_id'],
  fieldHandles: {
    google_event_id: 'google_event_id',
    calendar_id: 'google_calendar_id',
    summary: 'name',
    description: 'description',
    start: 'start_at',
    end: 'end_at',
    timezone: 'timezone',
    all_day: 'all_day',
    status: 'status',
    location: 'location',
    html_link: 'html_link',
    updated_at: 'updated_at',
  },
  relationshipHandles: {
    calendar: 'calendar',
  },
}
