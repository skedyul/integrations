import { defineWorkflow } from 'skedyul'

export default defineWorkflow({
  handle: 'sync-google-calendar-event-from-webhook',
  label: 'Sync Google Calendar Event',
  path: '../../../workflows/sync-google-calendar-event-from-webhook.yml',
  actions: [],
})
