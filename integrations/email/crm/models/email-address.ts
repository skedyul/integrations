/**
 * Email Address Model
 *
 * Individual email addresses that can send/receive.
 * Default: {subdomain}@skedyul.app
 */

import { defineModel } from 'skedyul'

export default defineModel({
  handle: 'email_address',
  label: 'Email Address',
  labelPlural: 'Email Addresses',
  labelTemplate: '{{ email }}',
  description: 'Email addresses for communication',
  scope: 'internal',

  fields: [
    {
      handle: 'email',
      label: 'Email Address',
      type: 'string',
      definitionHandle: 'email',
      required: true,
      unique: true,
      system: false,
      description: 'The email address',
      owner: 'app',
    },
    {
      handle: 'name',
      label: 'Display Name',
      type: 'string',
      required: false,
      system: false,
      description: 'Friendly name shown in email From field',
      owner: 'workplace',
    },
    {
      handle: 'is_default',
      label: 'Default Address',
      type: 'boolean',
      required: false,
      default: false,
      description: 'Whether this is the default sending address',
      owner: 'app',
    },
  ],
})
