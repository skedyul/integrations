/**
 * Calendar entity — Google Calendar metadata for install CRM maps.
 * Workflows apply via | google: "format", "calendar".
 */

import { defineEntity } from 'skedyul'
import { calendarCrmMapDefaults } from './crmMapDefaults'

export default defineEntity({
  handle: 'calendar',
  label: 'Calendar',
  labelPlural: 'Calendars',
  description: 'Google Calendar from app.google.calendar.created/updated sync and calendar import',
  crmMapDefaults: calendarCrmMapDefaults,
  fields: [
    {
      handle: 'google_calendar_id',
      label: 'Google Calendar ID',
      type: 'string',
      isUnique: true,
      required: true,
    },
    { handle: 'summary', label: 'Name', type: 'string' },
    { handle: 'primary', label: 'Primary', type: 'boolean' },
    { handle: 'timezone', label: 'Timezone', type: 'string' },
    { handle: 'description', label: 'Description', type: 'long_string' },
  ],
})
