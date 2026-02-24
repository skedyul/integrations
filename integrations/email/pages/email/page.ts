/**
 * Email Settings Page
 *
 * App only supports one email address per installation.
 * This is the default landing page.
 *
 * Path: /email
 */

import { definePage } from 'skedyul'

export default definePage({
  handle: 'email-setup',
  label: 'Setup',
  type: 'instance',
  path: '/email',
  default: true,
  navigation: true,

  context: {
    email_address: {
      model: 'email_address',
      mode: 'first',
    },
  },

  blocks: [
    {
      type: 'card',
      restructurable: false,
      header: {
        title: 'Email Settings',
        description: 'Manage your email address for sending and receiving messages.',
      },
      form: {
        id: 'email-settings-form',
        fields: [
          {
            component: 'input',
            id: 'email',
            row: 0,
            col: 0,
            label: 'Email Address',
            value: '{{ email_address.email }}',
            disabled: true,
          },
          {
            component: 'input',
            id: 'name',
            row: 1,
            col: 0,
            label: 'Name',
            value: '{{ email_address.name }}',
            placeholder: 'Enter a friendly name for this email',
          },
        ],
        layout: {
          type: 'form',
          rows: [
            { columns: [{ field: 'email', colSpan: 12 }] },
            { columns: [{ field: 'name', colSpan: 12 }] },
          ],
        },
        actions: [
          {
            handle: 'save_email_settings',
            label: 'Save',
            handler: 'update_email_address',
            variant: 'primary',
          },
        ],
      },
    },
  ],
})
