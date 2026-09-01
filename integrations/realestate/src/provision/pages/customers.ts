/**
 * Customers Page
 *
 * Enquiry event wiring + CRM map status for the customer entity.
 */

import { definePage } from 'skedyul'
import {
  enquiryEventTypes,
  enquiryWorkflowHandle,
} from '../events/rea-events'

export default definePage({
  handle: 'customers',
  label: 'Customers',
  type: 'instance',
  path: '/customers',
  audience: 'install',
  navigation: true,

  blocks: [
    {
      type: 'card',
      restructurable: false,
      header: {
        title: 'Enquiry Events',
        description:
          'REA EnquiryCreated webhooks emit app.realestate.enquiry.created for connected agencies.',
      },
      form: {
        id: 'enquiry-events-form',
        fields: [
          {
            component: 'alert',
            id: 'enquiry-events-info',
            row: 0,
            col: 0,
            props: {
              title: 'How enquiry sync works',
              description:
                'When REA sends EnquiryCreated webhooks for a connected agency, this app emits app.realestate.enquiry.created. The bundled sync-rea-enquiry-from-webhook workflow upserts customer, property, property ownership, and enquiry using the CRM maps on these pages.',
              icon: 'Info',
            },
          } as never,
          {
            component: 'EventWiringPanel',
            id: 'enquiry-event-wiring',
            row: 1,
            col: 0,
            props: {
              eventTypes: enquiryEventTypes,
              recommendedWorkflowHandle: enquiryWorkflowHandle,
            },
          } as never,
        ],
        layout: {
          type: 'form',
          rows: [
            { columns: [{ field: 'enquiry-events-info', colSpan: 12 }] },
            { columns: [{ field: 'enquiry-event-wiring', colSpan: 12 }] },
          ],
        },
      },
    },
    {
      type: 'card',
      restructurable: false,
      header: {
        title: 'CRM connections',
        description: 'Map the enquiring person to your workplace customer model.',
      },
      form: {
        id: 'customer-crm-form',
        fields: [
          {
            component: 'EntityCrmMapStatus',
            id: 'customer-crm-map-status',
            row: 0,
            col: 0,
            props: {
              entity: 'customer',
              title: 'Customers',
              description:
                'Map name, email, phone, and preferred contact method to your CRM',
            },
          } as never,
        ],
        layout: {
          type: 'form',
          rows: [{ columns: [{ field: 'customer-crm-map-status', colSpan: 12 }] }],
        },
      },
    },
  ],
})
