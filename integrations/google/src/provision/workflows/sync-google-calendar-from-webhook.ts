import { defineWorkflow } from 'skedyul'

export default defineWorkflow({
  handle: 'sync-google-calendar-from-webhook',
  label: 'Sync Google Calendar',
  path: '../../../workflows/sync-google-calendar-from-webhook.yml',
  actions: [],
})
