/**
 * Calendar event entity — Google Calendar event payload for install CRM maps.
 * Workflows apply via | google: "format", "calendar_event".
 */

import { defineEntity } from 'skedyul'
import { calendarEventCrmMapDefaults } from './crmMapDefaults'

export default defineEntity({
  handle: 'calendar_event',
  label: 'Calendar Event',
  labelPlural: 'Calendar Events',
  description:
    'Google Calendar event from app.google.calendar.event.* sync and calendar tools',
  crmMapDefaults: calendarEventCrmMapDefaults,
  ...({
    tools: { calendarWindowPull: 'calendar_window_pull' },
  } as { tools: { calendarWindowPull: string } }),
  fields: [
    {
      handle: 'google_event_id',
      label: 'Google Event ID',
      type: 'string',
      isUnique: true,
      // Match key for import/push; omit so Skedyul-native creates are allowed.
    },
    {
      handle: 'calendar_id',
      label: 'Calendar ID',
      type: 'string',
      // Google calendar id for sync; workplace create uses the calendar relation.
    },
    { handle: 'summary', label: 'Title', type: 'string' },
    { handle: 'description', label: 'Description', type: 'long_string' },
    { handle: 'start', label: 'Start', type: 'datetime' },
    { handle: 'end', label: 'End', type: 'datetime' },
    {
      handle: 'timezone',
      label: 'Timezone',
      type: 'string',
      ...({ definition: 'calendar/timezone' } as { definition: string }),
    },
    {
      handle: 'all_day',
      label: 'All Day',
      type: 'boolean',
      ...({ definition: 'calendar/all_day' } as { definition: string }),
    },
    {
      handle: 'status',
      label: 'Status',
      type: 'string',
      ...({ definition: 'calendar/status' } as { definition: string }),
    },
    {
      handle: 'location',
      label: 'Location',
      type: 'string',
      ...({ definition: 'calendar/location' } as { definition: string }),
    },
    { handle: 'html_link', label: 'Google Calendar Link', type: 'string' },
    { handle: 'updated_at', label: 'Updated At', type: 'datetime' },
    {
      handle: 'recurrence',
      label: 'Recurrence Rules',
      type: 'object',
      // 1.7.26 types omit definition; runtime + schema keep the handle.
      ...({ definition: 'calendar/recurrence' } as { definition: string }),
    },
    {
      handle: 'recurring_event_id',
      label: 'Recurring Event ID',
      type: 'string',
      ...({ definition: 'calendar/series_id' } as { definition: string }),
    },
    {
      handle: 'original_start',
      label: 'Original Start',
      type: 'datetime',
      ...({ definition: 'calendar/original_start' } as { definition: string }),
    },
    { handle: 'attendees', label: 'Attendees', type: 'object' },
    { handle: 'etag', label: 'ETag', type: 'string' },
  ],
  relationships: [
    {
      handle: 'calendar',
      label: 'Calendar',
      targetEntity: 'calendar',
    },
    {
      handle: 'organizer',
      label: 'Organizer',
      targetEntity: 'user',
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
