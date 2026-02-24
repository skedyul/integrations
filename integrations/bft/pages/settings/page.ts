/**
 * Settings Page
 *
 * Business details form with sync all action.
 *
 * Path: /settings
 */

import { definePage } from 'skedyul'

export default definePage({
  handle: 'settings',
  label: 'General',
  type: 'instance',
  path: '/settings',
  navigation: true,

  context: {
    business_details: {
      model: 'business_details',
      mode: 'first',
      filters: {
        id: { eq: '{{ path_params.business_details_id }}' },
      },
    },
  },

  blocks: [
    {
      type: 'card',
      restructurable: false,
      header: {
        title: 'Business Details',
        description: 'Update business contact information',
      },
      form: {
        id: 'business-details-form',
        fields: [
          {
            component: 'input',
            id: 'name',
            row: 0,
            col: 0,
            label: 'Name',
            value: '{{ business_details.name }}',
            placeholder: 'Enter business name',
          },
          {
            component: 'input',
            id: 'club_id',
            row: 1,
            col: 0,
            label: 'Club ID',
            value: '{{ business_details.club_id }}',
            placeholder: 'Enter club ID',
          },
          {
            component: 'input',
            id: 'address',
            row: 2,
            col: 0,
            label: 'Address',
            value: '{{ business_details.address }}',
            placeholder: 'Enter business address',
          },
          {
            component: 'input',
            id: 'phone',
            row: 3,
            col: 0,
            label: 'Phone',
            value: '{{ business_details.phone }}',
            placeholder: 'Enter phone number',
          },
          {
            component: 'input',
            id: 'email',
            row: 4,
            col: 0,
            label: 'Email',
            value: '{{ business_details.email }}',
            placeholder: 'Enter email address',
          },
          {
            component: 'input',
            id: 'website_url',
            row: 5,
            col: 0,
            label: 'Website URL',
            value: '{{ business_details.website_url }}',
            placeholder: 'Enter website URL',
          },
        ],
        layout: {
          type: 'form',
          rows: [
            { columns: [{ field: 'name', colSpan: 12 }] },
            { columns: [{ field: 'club_id', colSpan: 12 }] },
            { columns: [{ field: 'address', colSpan: 12 }] },
            { columns: [{ field: 'phone', colSpan: 12 }] },
            { columns: [{ field: 'email', colSpan: 12 }] },
            { columns: [{ field: 'website_url', colSpan: 12 }] },
          ],
        },
        actions: [
          {
            handle: 'update_business_details',
            label: 'Update',
            handler: 'update_business_details',
            variant: 'primary',
          },
        ],
      },
    },
    {
      type: 'card',
      restructurable: false,
      form: {
        id: 'sync-all-form',
        fields: [
          {
            component: 'fieldsetting',
            id: 'sync_all',
            row: 0,
            col: 0,
            label: 'Sync All Data',
            description: 'Refresh all data from BFT (packages, classes, and business details)',
            mode: 'field',
            button: {
              label: 'Sync All',
              variant: 'outline',
              size: 'sm',
              leftIcon: 'RefreshCw',
            },
            modalForm: {
              header: {
                title: 'Sync All Data',
                description: 'This will refresh all data from BFT (packages, classes, and business details).',
              },
              handler: 'refresh_data',
              fields: [],
            },
          },
        ],
        layout: {
          type: 'form',
          rows: [
            { columns: [{ field: 'sync_all', colSpan: 12 }] },
          ],
        },
      },
    },
  ],
})
