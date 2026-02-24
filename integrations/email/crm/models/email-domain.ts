/**
 * Email Domain Model
 *
 * Stores domain configuration and verification status.
 * For now, only skedyul.app is supported.
 */

import { defineModel } from 'skedyul'

export default defineModel({
  handle: 'email_domain',
  label: 'Email Domain',
  labelPlural: 'Email Domains',
  labelTemplate: '{{ domain }}',
  description: 'Email domains for sending and receiving',
  scope: 'internal',

  fields: [
    {
      handle: 'domain',
      label: 'Domain',
      type: 'string',
      required: true,
      unique: true,
      description: 'The email domain (e.g., skedyul.app)',
      owner: 'app',
    },
    {
      handle: 'type',
      label: 'Type',
      type: 'string',
      required: true,
      description: 'Domain type: system (skedyul.app) or custom',
      owner: 'app',
      default: 'system',
      constraints: {
        limitChoices: 1,
        options: [
          { label: 'System', value: 'system' },
          { label: 'Custom', value: 'custom' },
        ],
      },
    },
    {
      handle: 'status',
      label: 'Status',
      type: 'string',
      required: true,
      default: 'active',
      description: 'Domain verification status',
      owner: 'app',
      constraints: {
        limitChoices: 1,
        options: [
          { label: 'Pending', value: 'pending', color: 'yellow' },
          { label: 'Verifying', value: 'verifying', color: 'blue' },
          { label: 'Active', value: 'active', color: 'green' },
          { label: 'Failed', value: 'failed', color: 'red' },
        ],
      },
    },
  ],
})
