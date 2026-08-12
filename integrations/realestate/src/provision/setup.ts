import { defineSetupStep } from 'skedyul'

export const connectAgenciesStep = defineSetupStep({
  handle: 'connect_agencies',
  label: 'Connect Agencies',
  description:
    'Authorize this partner in Ignite, then check status here. The check calls REA directly — no form required.',
  kind: 'app',
  capabilities: ['agency.connected'],
  actionTool: 'check_ignite_integration',
  actionLabel: 'Check Ignite status',
})

export const setupLeadsStep = defineSetupStep({
  handle: 'setup_leads',
  label: 'Set up Leads',
  description:
    'Map Lead and Enquiry to your CRM and enable the enquiry sync workflow.',
  kind: 'crm',
  requires: ['connect_agencies'],
  entities: ['lead', 'enquiry'],
  workflowHandles: ['sync-rea-enquiry-from-webhook'],
  listenToCrm: true,
  capabilities: ['crm.lead', 'realtime.lead', 'crm.enquiry', 'realtime.enquiry'],
  href: '/leads',
})

export default [connectAgenciesStep, setupLeadsStep]
