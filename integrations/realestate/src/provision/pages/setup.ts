/**
 * Install Setup Page
 *
 * Guided checklist + inline Check Ignite status tool (no modal/dialog).
 */

import { definePage } from 'skedyul'
import { IGNITE_INTEGRATIONS_URL } from '../../lib/rea-types'

export default definePage({
  handle: 'setup',
  label: 'Setup',
  type: 'instance',
  path: '/setup',
  audience: 'install',
  default: true,
  navigation: true,

  context: {
    agencies: {
      model: 'agency',
      mode: 'many',
      filters: {
        status: { eq: 'ACTIVE' },
      },
      limit: 50,
    },
  },

  blocks: [
    {
      type: 'card',
      restructurable: false,
      header: {
        title: 'Setup realestate.com.au',
        description:
          'Authorize agencies in Ignite, then map customers, properties, and enquiries to your CRM. One install supports many agencies.',
      },
      form: {
        id: 'install-setup-form',
        fields: [
          {
            component: 'InstallSetupPanel',
            id: 'install-setup-panel',
            row: 0,
            col: 0,
            props: {},
          } as never,
        ],
        layout: {
          type: 'form',
          rows: [{ columns: [{ field: 'install-setup-panel', colSpan: 12 }] }],
        },
      },
    },
    {
      type: 'card',
      restructurable: false,
      header: {
        title: 'Ignite authorization',
        description:
          'Ask each agency to enable this partner in Ignite, then check status here. No form required.',
      },
      form: {
        id: 'ignite-check-form',
        fields: [
          {
            component: 'alert',
            id: 'ignite-instructions',
            row: 0,
            col: 0,
            props: {
              title: 'Enable in Ignite',
              description: `Each agency must authorize this partner at ${IGNITE_INTEGRATIONS_URL} with lead enquiry access. After they enable it, click Check Ignite status.`,
              icon: 'Info',
            },
          } as never,
          {
            component: 'fieldsetting',
            id: 'check_ignite',
            row: 1,
            col: 0,
            label: 'Ignite integration',
            description: [
              "{%- assign active_count = agencies | size -%}",
              "{%- if active_count > 0 -%}",
              "{{ active_count }} active agency(ies) connected. Click to refresh from REA.",
              "{%- else -%}",
              "No agencies connected yet. After authorizing in Ignite, check status — this calls REA directly.",
              "{%- endif -%}",
            ].join(''),
            mode: 'field',
            handler: 'check_ignite_integration',
            button: {
              label: 'Check Ignite status',
              variant: 'default',
              size: 'sm',
            },
          } as never,
          {
            component: 'fieldsetting',
            id: 'ensure_webhooks',
            row: 2,
            col: 0,
            label: 'REA lead webhooks',
            description:
              'Point REA EnquiryCreated at this install. Use if Temporal shows no webhook activity.',
            mode: 'field',
            handler: 'ensure_rea_webhooks',
            button: {
              label: 'Ensure REA webhooks',
              variant: 'outline',
              size: 'sm',
            },
          } as never,
        ],
        layout: {
          type: 'form',
          rows: [
            { columns: [{ field: 'ignite-instructions', colSpan: 12 }] },
            { columns: [{ field: 'check_ignite', colSpan: 12 }] },
            { columns: [{ field: 'ensure_webhooks', colSpan: 12 }] },
          ],
        },
      },
    },
  ],

  actions: [
    {
      handle: 'check_ignite_integration',
      label: 'Check Ignite status',
      handler: 'check_ignite_integration',
      icon: 'RefreshCw',
      variant: 'primary',
    },
    {
      handle: 'ensure_rea_webhooks',
      label: 'Ensure REA webhooks',
      handler: 'ensure_rea_webhooks',
      icon: 'Webhook',
      variant: 'secondary',
    },
  ],
})
