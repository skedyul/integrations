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

export const setupCrmStep = defineSetupStep({
  handle: 'setup_crm',
  label: 'Set up CRM',
  description:
    'Map customers, properties, enquiries, and property ownership to your CRM and enable the enquiry sync workflow.',
  kind: 'crm',
  requires: ['connect_agencies'],
  entities: ['customer', 'property', 'enquiry', 'property_ownership'],
  workflowHandles: ['sync-rea-enquiry-from-webhook'],
  listenToCrm: true,
  capabilities: [
    'crm.customer',
    'crm.property',
    'crm.enquiry',
    'crm.property_ownership',
    'realtime.enquiry',
  ],
  href: '/customers',
})

export default [connectAgenciesStep, setupCrmStep]
