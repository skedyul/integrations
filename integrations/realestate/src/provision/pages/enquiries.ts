/**
 * Enquiries Page
 *
 * CRM map status for the enquiry entity.
 */

import { definePage } from 'skedyul'

export default definePage({
  handle: 'enquiries',
  label: 'Enquiries',
  type: 'instance',
  path: '/enquiries',
  audience: 'install',
  navigation: true,

  blocks: [
    {
      type: 'card',
      restructurable: false,
      header: {
        title: 'CRM connections',
        description:
          'Map REA enquiry rows (and customer/property links) to your workplace enquiry model.',
      },
      form: {
        id: 'enquiry-crm-form',
        fields: [
          {
            component: 'alert',
            id: 'enquiry-sync-info',
            row: 0,
            col: 0,
            props: {
              title: 'Filled by enquiry sync',
              description:
                'When an EnquiryCreated webhook arrives, sync-rea-enquiry-from-webhook upserts the enquiry and sets customer and property relationships from the earlier upserts.',
              icon: 'Info',
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
                'Map rea_enquiry_id, enquiry fields, and customer/property relationships to your CRM',
            },
          } as never,
        ],
        layout: {
          type: 'form',
          rows: [
            { columns: [{ field: 'enquiry-sync-info', colSpan: 12 }] },
            { columns: [{ field: 'enquiry-crm-map-status', colSpan: 12 }] },
          ],
        },
      },
    },
  ],
})
