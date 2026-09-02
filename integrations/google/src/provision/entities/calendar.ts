/**
 * Calendar entity — Google Calendar metadata and per-install sync/watch state.
 * Mapped onto the workplace calendar model at install time.
 * Workflows apply via | google: "format", "calendar".
 */

import { defineEntity } from 'skedyul'
import { calendarCrmMapDefaults } from './crmMapDefaults'

export default defineEntity({
  handle: 'calendar',
  label: 'Calendar',
  labelPlural: 'Calendars',
  description:
    'Google Calendar from app.google.calendar.created/updated sync and calendar import. Sync and watch state live on the mapped workplace model — not an internal model.',
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
    {
      handle: 'timezone',
      label: 'Timezone',
      type: 'string',
      ...({ definition: 'calendar/timezone' } as { definition: string }),
    },
    {
      handle: 'color',
      label: 'Color',
      type: 'string',
      ...({ definition: 'calendar/color' } as { definition: string }),
    },
    { handle: 'description', label: 'Description', type: 'long_string' },
    {
      handle: 'sync_enabled',
      label: 'Sync Enabled',
      type: 'boolean',
    },
    {
      handle: 'sync_direction',
      label: 'Sync Direction',
      type: 'string',
      options: [
        { value: 'push', label: 'Push to Google' },
        { value: 'pull', label: 'Pull from Google' },
        { value: 'both', label: 'Two-way' },
      ],
    },
    {
      handle: 'external_read_only',
      label: 'External Read Only',
      type: 'boolean',
    },
    {
      handle: 'sync_token',
      label: 'Sync Token',
      type: 'string',
    },
    {
      handle: 'watch_channel_id',
      label: 'Watch Channel ID',
      type: 'string',
    },
    {
      handle: 'watch_resource_id',
      label: 'Watch Resource ID',
      type: 'string',
    },
    {
      handle: 'watch_expiration',
      label: 'Watch Expiration',
      type: 'datetime',
    },
    {
      handle: 'watch_token',
      label: 'Watch Token',
      type: 'string',
    },
    {
      handle: 'last_synced_at',
      label: 'Last Synced At',
      type: 'datetime',
    },
  ],
})
