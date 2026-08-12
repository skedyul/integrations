import { defineWorkflow } from 'skedyul'

export default defineWorkflow({
  handle: 'sync-rea-enquiry-from-webhook',
  label: 'Default Realestate Enquiry Event',
  path: '../../../workflows/sync-rea-enquiry-from-webhook.yml',
  actions: [],
})
