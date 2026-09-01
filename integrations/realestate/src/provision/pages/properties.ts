/**
 * Properties Page
 *
 * CRM map status for property and property_ownership entities.
 */

import { definePage } from 'skedyul'

export default definePage({
  handle: 'properties',
  label: 'Properties',
  type: 'instance',
  path: '/properties',
  audience: 'install',
  navigation: true,

  blocks: [
    {
      type: 'card',
      restructurable: false,
      header: {
        title: 'CRM connections',
        description:
          'Map listing properties and the customer↔property join used by the enquiry workflow.',
      },
      form: {
        id: 'property-crm-form',
        fields: [
          {
            component: 'alert',
            id: 'property-sync-info',
            row: 0,
            col: 0,
            props: {
              title: 'Filled by enquiry sync',
              description:
                'When an EnquiryCreated webhook arrives, sync-rea-enquiry-from-webhook upserts the listing and a property ownership row linking the customer to that property. Role is left unset for buyer enquiries.',
              icon: 'Info',
            },
          } as never,
          {
            component: 'EntityCrmMapStatus',
            id: 'property-crm-map-status',
            row: 1,
            col: 0,
            props: {
              entity: 'property',
              title: 'Properties',
              description: 'Map listing_id and address to your CRM property model',
            },
          } as never,
          {
            component: 'EntityCrmMapStatus',
            id: 'property-ownership-crm-map-status',
            row: 2,
            col: 0,
            props: {
              entity: 'property_ownership',
              title: 'Property ownership',
              description:
                'Map ownership_key and customer/property relationships to your CRM join model',
            },
          } as never,
        ],
        layout: {
          type: 'form',
          rows: [
            { columns: [{ field: 'property-sync-info', colSpan: 12 }] },
            { columns: [{ field: 'property-crm-map-status', colSpan: 12 }] },
            {
              columns: [
                { field: 'property-ownership-crm-map-status', colSpan: 12 },
              ],
            },
          ],
        },
      },
    },
  ],
})
