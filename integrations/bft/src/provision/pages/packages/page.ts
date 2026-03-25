/**
 * Packages Page
 *
 * Model mapper for packages with sync action.
 *
 * Path: /packages
 */

import { definePage } from 'skedyul'

export default definePage({
  handle: 'packages',
  label: 'Packages',
  type: 'instance',
  path: '/packages',
  default: true,
  navigation: true,

  blocks: [
    {
      type: 'model_mapper',
      model: 'package',
    },
    {
      type: 'card',
      restructurable: false,
      form: {
        id: 'sync-packages-form',
        fields: [
          {
            component: 'fieldsetting',
            id: 'sync_packages',
            row: 0,
            col: 0,
            label: 'Sync Packages',
            description: 'Refresh packages from BFT',
            mode: 'field',
            button: {
              label: 'Sync Packages',
              variant: 'outline',
              size: 'sm',
              leftIcon: 'RefreshCw',
            },
            modalForm: {
              header: {
                title: 'Sync Packages',
                description: 'This will refresh all packages from BFT.',
              },
              handler: 'sync_packages',
              fields: [],
            },
          },
        ],
        layout: {
          type: 'form',
          rows: [
            { columns: [{ field: 'sync_packages', colSpan: 12 }] },
          ],
        },
      },
    },
  ],
})
