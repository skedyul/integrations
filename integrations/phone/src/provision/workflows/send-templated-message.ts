/**
 * Send Templated Message Workflow
 *
 * Automation template for sending templated SMS messages.
 */

import { defineWorkflow } from 'skedyul'

export default defineWorkflow({
  handle: 'send-templated-message',
  label: 'Send Templated Message',
  path: './send-templated-message.yml',

  requires: [{ channel: 'sms' }],

  actions: [
    {
      handle: 'send-templated-sms-message',
      label: 'Send templated message',
      batch: true,
      entityHandle: 'contact',
      inputs: [
        {
          key: 'identifier-value',
          label: 'Recipient Phone',
          fieldRef: { fieldHandle: 'phone', entityHandle: 'contact' },
        },
        {
          key: 'communication-channel-id',
          label: 'Communication Channel',
          template: '{{ input }}',
        },
        {
          key: 'message',
          label: 'Message',
          template: '{{ input }}',
        },
      ],
    },
  ],
})
