/**
 * Overview Page
 *
 * Petbooqz sync is handled by tools and workflows.
 *
 * Path: /overview
 */

import { definePage } from 'skedyul'

export default definePage({
  handle: 'overview',
  label: 'Overview',
  type: 'instance',
  path: '/overview',
  default: true,
  navigation: true,

  blocks: [
    {
      type: 'card',
      restructurable: false,
      header: {
        title: 'Petbooqz sync',
        description:
          'Client, patient, and booking data is read from Petbooqz by tools and synchronized through workflows.',
      },
      form: {
        id: 'petbooqz-overview',
        fields: [
          {
            component: 'Alert',
            id: 'workflow-sync-info',
            row: 0,
            col: 0,
            props: {
              title: 'Workflow-driven sync',
              description:
                'Use the booking agents and workflow automations to search records, book appointments, and keep downstream systems updated.',
              icon: 'Info',
            },
          },
        ],
        layout: {
          type: 'form',
          rows: [{ columns: [{ field: 'workflow-sync-info', colSpan: 12 }] }],
        },
      },
    },
  ],
})
