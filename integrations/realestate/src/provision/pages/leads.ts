/**
 * Leads Page
 *
 * Shows REA enquiry events and workflow wiring guidance.
 */

import { definePage } from 'skedyul'

const enquiryEvents = [
  {
    name: 'enquiry.created',
    label: 'Enquiry created',
    description: 'A new realestate.com.au enquiry was received',
  },
]

export default definePage({
  handle: 'leads',
  label: 'Leads',
  type: 'instance',
  path: '/leads',
  navigation: true,

  blocks: [
    {
      type: 'card',
      restructurable: false,
      header: {
        title: 'Lead Events',
        description:
          'REA enquiry webhooks emit app events for workflow-driven CRM sync.',
      },
      form: {
        id: 'lead-events-form',
        fields: [
          {
            component: 'Alert',
            id: 'lead-events-info',
            row: 0,
            col: 0,
            props: {
              title: 'How lead sync works',
              description:
                'When REA sends EnquiryCreated webhooks, this integration emits app.realestate.enquiry.created events. Connect a workflow to upsert prospect and contact records from the enquiry payload.',
              icon: 'Info',
            },
          },
          {
            component: 'EventWiringPanel',
            id: 'lead-event-wiring',
            row: 1,
            col: 0,
            props: {
              eventTypes: enquiryEvents,
            },
          },
        ],
      },
    },
  ],
})
