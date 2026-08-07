import { defineSetupStep } from 'skedyul'

export const connectAgenciesStep = defineSetupStep({
  handle: 'connect_agencies',
  label: 'Connect Agencies',
  description:
    'Authorize this partner in Ignite, then check status here. The check calls REA directly — no form required.',
  kind: 'app',
  capabilities: ['agency.connected'],
})

export const setupLeadsStep = defineSetupStep({
  handle: 'setup_leads',
  label: 'Set up Leads',
  description:
    'Map REA enquiry fields to your CRM and enable the lead sync workflow.',
  kind: 'crm',
  requires: ['connect_agencies'],
  entities: ['lead'],
  workflowHandles: ['sync-rea-enquiry-from-webhook'],
  listenToCrm: true,
  capabilities: ['crm.lead', 'realtime.lead'],
})

export default [connectAgenciesStep, setupLeadsStep]
