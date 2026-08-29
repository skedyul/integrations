/**
 * Agencies Page
 *
 * Lists REA agencies discovered via Ignite authorization / Integrations API.
 * Uses a card + context list (same pattern as phone / Facebook pages), not a
 * top-level list block — those render as a generic "Showing all items" card.
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

  context: {
    agencies: {
      model: 'agency',
      mode: 'many',
      limit: 50,
    },
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
            label: 'Ignite integration',
            description: [
              "{%- assign active_count = 0 -%}",
              "{%- for agency in agencies -%}",
              "{%- if agency.status == 'ACTIVE' -%}",
              "{%- assign active_count = active_count | plus: 1 -%}",
              "{%- endif -%}",
              "{%- endfor -%}",
              "{%- if active_count > 0 -%}",
              "{{ active_count }} active agency(ies). Click to refresh from REA.",
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
            component: 'list',
            id: 'agencies_list',
            row: 2,
            col: 0,
            iterable: '{{ agencies }}',
            itemTemplate: {
              component: 'ActionTile',
              span: 12,
              mdSpan: 12,
              lgSpan: 12,
              props: {
                id: '{{ item.id }}',
                label: '{{ item.agency_id }}',
                description: [
                  "{{ item.status }}",
                  "{%- if item.has_lead_scope -%} · Lead scope{%- endif -%}",
                ].join(''),
                leftIcon: 'Building2',
              },
            },
            title: 'Agencies',
            emptyMessage:
              'No agencies yet. Authorize in Ignite, then check status.',
          } as never,
        ],
        layout: {
          type: 'form',
          rows: [
            { columns: [{ field: 'agencies-info', colSpan: 12 }] },
            { columns: [{ field: 'refresh_agencies', colSpan: 12 }] },
            { columns: [{ field: 'agencies_list', colSpan: 12 }] },
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
  ],
})
