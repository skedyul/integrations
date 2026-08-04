/**
 * Agencies Page
 *
 * Lists REA agencies discovered via Ignite authorization / Integrations API.
 */

import { definePage } from 'skedyul'
import { IGNITE_INTEGRATIONS_URL } from '../../lib/rea-types'

export default definePage({
  handle: 'agencies',
  label: 'Agencies',
  type: 'list',
  path: '/agencies',
  audience: 'install',
  navigation: true,

  filter: {
    model: 'agency',
  },

  blocks: [
    {
      type: 'card',
      restructurable: false,
      header: {
        title: 'Connected Agencies',
        description:
          'Agencies that have authorized this partner in Ignite. Enquiry webhooks are accepted for ACTIVE agencies only.',
      },
      form: {
        id: 'agencies-refresh-form',
        fields: [
          {
            component: 'alert',
            id: 'agencies-info',
            row: 0,
            col: 0,
            props: {
              title: 'How agencies connect',
              description: `Agencies authorize in Ignite (${IGNITE_INTEGRATIONS_URL}). Integration webhooks and Check Ignite status keep this list in sync.`,
              icon: 'Info',
            },
          } as never,
          {
            component: 'fieldsetting',
            id: 'refresh_agencies',
            row: 1,
            col: 0,
            label: 'Refresh from Ignite',
            description: 'Re-check REA Integrations API and update agency records.',
            mode: 'field',
            handler: 'check_ignite_integration',
            button: {
              label: 'Check Ignite status',
              variant: 'outline',
              size: 'sm',
            },
          } as never,
        ],
        layout: {
          type: 'form',
          rows: [
            { columns: [{ field: 'agencies-info', colSpan: 12 }] },
            { columns: [{ field: 'refresh_agencies', colSpan: 12 }] },
          ],
        },
      },
    },
    {
      type: 'list',
      model: 'agency',
      columns: [
        { field: 'agency_id', label: 'Agency ID' },
        { field: 'status', label: 'Status' },
        { field: 'has_lead_scope', label: 'Lead scope' },
        { field: 'connected_at', label: 'Connected' },
      ],
      emptyState: {
        title: 'No agencies yet',
        description: 'Authorize in Ignite, then check status on Setup.',
      },
    } as never,
  ],

  actions: [
    {
      handle: 'check_ignite_integration',
      label: 'Check Ignite status',
      handler: 'check_ignite_integration',
      icon: 'RefreshCw',
      variant: 'primary',
    },
  ],
})
