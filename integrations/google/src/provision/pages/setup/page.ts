/**
 * Install Setup Page
 *
 * Guided checklist for connecting Google and configuring calendar event sync.
 * Path: /setup
 */

import { definePage } from 'skedyul'

export default definePage({
  handle: 'setup',
  label: 'Setup',
  type: 'instance',
  path: '/setup',
  audience: 'install',
  default: true,
  navigation: true,

  blocks: [
    {
      type: 'card',
      restructurable: false,
      header: {
        title: 'Setup Google',
        description:
          'Connect your Google account, link calendars, and map calendar events to your CRM.',
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
          },
        ],
        layout: {
          type: 'form',
          rows: [{ columns: [{ field: 'install-setup-panel', colSpan: 12 }] }],
        },
      },
    },
  ],
})
