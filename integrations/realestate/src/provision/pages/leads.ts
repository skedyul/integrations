/**
 * Leads Page
 *
 * CRM map status for lead + enquiry entities + wiring guidance.
 */

import { definePage } from 'skedyul'

export default definePage({
  handle: 'leads',
  label: 'Leads',
  type: 'instance',
  path: '/leads',
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
        id: 'lead-events-form',
        fields: [
          {
            component: 'alert',
            id: 'lead-events-info',
            row: 0,
            col: 0,
            props: {
              title: 'How enquiry sync works',
              description:
                'When REA sends EnquiryCreated webhooks for a connected agency, this app emits app.realestate.enquiry.created. The bundled Default Realestate Enquiry Event workflow create-or-finds a Lead (by email/phone), always upserts an Enquiry linked to that Lead, and signals the conversation contact.',
              icon: 'Info',
            },
          } as never,
          {
            component: 'EventWiringPanel',
            id: 'lead-event-wiring',
            row: 1,
            col: 0,
            props: {
              eventTypes: [
                {
                  name: 'enquiry.created',
                  label: 'Enquiry created',
                  description: 'A new realestate.com.au enquiry was received',
                },
              ],
              recommendedWorkflowHandle: 'sync-rea-enquiry-from-webhook',
            },
          } as never,
        ],
        layout: {
          type: 'form',
          rows: [
            { columns: [{ field: 'lead-events-info', colSpan: 12 }] },
            { columns: [{ field: 'lead-event-wiring', colSpan: 12 }] },
          ],
        },
      },
    },
    {
      type: 'card',
      restructurable: false,
      header: {
        title: 'CRM connections',
        description:
          'Map Lead (person) and Enquiry (each REA enquiry) to your workplace CRM. One Lead can have many Enquiries.',
      },
      form: {
        id: 'lead-crm-form',
        fields: [
          {
            component: 'EntityCrmMapStatus',
            id: 'lead-crm-map-status',
            row: 0,
            col: 0,
            props: {
              entity: 'lead',
              title: 'Leads',
              description:
                'Map person/prospect fields (email, phone, name). Matched create-or-find on email/phone.',
            },
          } as never,
          {
            component: 'EntityCrmMapStatus',
            id: 'enquiry-crm-map-status',
            row: 1,
            col: 0,
            props: {
              entity: 'enquiry',
              title: 'Enquiries',
              description:
                'Map enquiry fields (rea_enquiry_id, listing, comments) and the lead relationship. Always upserted per webhook.',
            },
          } as never,
        ],
        layout: {
          type: 'form',
          rows: [
            { columns: [{ field: 'lead-crm-map-status', colSpan: 12 }] },
            { columns: [{ field: 'enquiry-crm-map-status', colSpan: 12 }] },
          ],
        },
      },
    },
  ],
})
