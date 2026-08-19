/**
 * Calendar event entity — Google Calendar event payload for install CRM maps.
 * Workflows apply via | google: "format", "calendar_event".
 */

import { defineEntity, type EntityFieldDefinition } from 'skedyul'
import { calendarEventCrmMapDefaults } from './crmMapDefaults'

const calendarEventFields = [
  {
    handle: 'google_event_id',
    label: 'Google Event ID',
    type: 'string',
    isUnique: true,
    required: true,
  },
  {
    handle: 'calendar_id',
    label: 'Calendar ID',
    type: 'string',
    required: true,
  },
  { handle: 'summary', label: 'Title', type: 'string' },
  { handle: 'description', label: 'Description', type: 'long_string' },
  { handle: 'start', label: 'Start', type: 'datetime' },
  { handle: 'end', label: 'End', type: 'datetime' },
  { handle: 'timezone', label: 'Timezone', type: 'string' },
  { handle: 'all_day', label: 'All Day', type: 'boolean' },
  { handle: 'status', label: 'Status', type: 'string' },
  { handle: 'location', label: 'Location', type: 'string' },
  { handle: 'html_link', label: 'Google Calendar Link', type: 'string' },
  { handle: 'updated_at', label: 'Updated At', type: 'datetime' },
  {
    handle: 'recurrence',
    label: 'Recurrence Rules',
    type: 'object',
    definition: 'calendar/recurrence',
  },
  {
    handle: 'recurring_event_id',
    label: 'Recurring Event ID',
    type: 'string',
    definition: 'calendar/series_id',
  },
  {
    handle: 'original_start',
    label: 'Original Start',
    type: 'datetime',
    definition: 'calendar/original_start',
  },
  { handle: 'attendees', label: 'Attendees', type: 'object' },
  { handle: 'etag', label: 'ETag', type: 'string' },
] as Array<EntityFieldDefinition & { definition?: string }>

export default defineEntity({
  handle: 'calendar_event',
  label: 'Calendar Event',
  labelPlural: 'Calendar Events',
  description:
    'Google Calendar event from app.google.calendar.event.* sync and calendar tools',
  crmMapDefaults: calendarEventCrmMapDefaults,
  fields: calendarEventFields,
  relationships: [
    {
      handle: 'calendar',
      label: 'Calendar',
      targetEntity: 'calendar',
    },
  ],
  contextFields: [
    {
      handle: 'calendar_summary',
      label: 'Calendar Name',
      type: 'string',
    },
    {
      handle: 'sync_trigger',
      label: 'Sync Trigger',
      type: 'string',
      options: [
        { value: 'manual', label: 'Manual' },
        { value: 'push', label: 'Push notification' },
        { value: 'install', label: 'Install backfill' },
        { value: 'tool', label: 'Tool' },
        { value: 'import', label: 'Import' },
      ],
    },
  ],
})
