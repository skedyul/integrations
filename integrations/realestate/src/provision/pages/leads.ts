/**
 * Leads Page
 *
 * CRM map status for the lead entity + wiring guidance.
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
        title: 'Lead Events',
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
              title: 'How lead sync works',
              description:
                'When REA sends EnquiryCreated webhooks for a connected agency, this app emits app.realestate.enquiry.created. The bundled sync-rea-enquiry-from-webhook workflow upserts your CRM using the lead entity map.',
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
        description: 'Map enquiry fields to your workplace CRM for zero-config sync.',
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
                'Map REA enquiry fields (including rea_enquiry_id and rea_agency_id) to your CRM',
            },
          } as never,
        ],
        layout: {
          type: 'form',
          rows: [{ columns: [{ field: 'lead-crm-map-status', colSpan: 12 }] }],
        },
      },
    },
  ],
})
