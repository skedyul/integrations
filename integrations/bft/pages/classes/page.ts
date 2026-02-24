/**
 * Classes Page
 *
 * Model mapper for classes with sync action.
 *
 * Path: /classes
 */

import { definePage } from 'skedyul'

export default definePage({
  handle: 'classes',
  label: 'Classes',
  type: 'instance',
  path: '/classes',
  navigation: true,

  blocks: [
    {
      type: 'model_mapper',
      model: 'class',
    },
    {
      type: 'card',
      restructurable: false,
      form: {
        id: 'sync-classes-form',
        fields: [
          {
            component: 'fieldsetting',
            id: 'sync_classes',
            row: 0,
            col: 0,
            label: 'Sync Classes',
            description: 'Refresh classes from BFT',
            mode: 'field',
            button: {
              label: 'Sync Classes',
              variant: 'outline',
              size: 'sm',
              leftIcon: 'RefreshCw',
            },
            modalForm: {
              header: {
                title: 'Sync Classes',
                description: 'This will refresh all classes from BFT.',
              },
              handler: 'sync_classes',
              fields: [],
            },
          },
        ],
        layout: {
          type: 'form',
          rows: [
            { columns: [{ field: 'sync_classes', colSpan: 12 }] },
          ],
        },
      },
    },
  ],
})
