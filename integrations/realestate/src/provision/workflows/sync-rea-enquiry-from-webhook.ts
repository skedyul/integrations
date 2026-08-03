import { defineWorkflow } from 'skedyul'

export default defineWorkflow({
  handle: 'sync-rea-enquiry-from-webhook',
  label: 'Default REA Enquiry Created',
  path: '../../../workflows/sync-rea-enquiry-from-webhook.yml',
  actions: [],
})
