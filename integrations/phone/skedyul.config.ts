import { defineConfig } from 'skedyul'

export default defineConfig({
  name: 'Phone',
  version: '1.0.0',
  description: 'SMS and voice communication via Twilio',
  computeLayer: 'serverless',
  tools: import('./src/registry'),
  webhooks: import('./src/webhooks'),

  env: {
    // Global environment variables (developer-level, shared across all installs)
    // Install-specific variables are in preInstall.env and postInstall.env...
  },

  // Unified model definitions (INTERNAL + SHARED)
  models: [
    {
      handle: 'phone_number',
      name: 'Phone Number',
      namePlural: 'Phone Numbers',
      scope: 'INTERNAL', // App owns this, auto-created when feature is provisioned
      labelTemplate: '{{ phone }}',
      description: 'Phone numbers assigned to workplaces for SMS/voice communication',
      fields: [
        {
          handle: 'phone',
          label: 'Phone Number',
          type: 'STRING',
          definitionHandle: 'phone',
          required: true,
          unique: true,
          system: true,
          description: 'The dedicated phone number (E.164 format)',
        },
        {
          handle: 'forwarding_phone_number',
          label: 'Forwarding Phone Number',
          type: 'STRING',
          definitionHandle: 'phone',
          required: false,
          system: true,
          description: 'Phone number to forward calls to',
        },
      ],
    },
    {
      handle: 'contact',
      name: 'Contact',
      namePlural: 'Contacts',
      scope: 'SHARED', // User maps to their existing model
      fields: [
        {
          handle: 'phone',
          label: 'Phone Number',
          definitionHandle: 'phone',
          required: true,
          system: false,
          unique: false,
          visibility: { data: true, list: true, filters: true },
        },
        {
          handle: 'opt_in',
          label: 'Opt In',
          definitionHandle: 'system/opt_in',
          required: false,
          system: true,
          defaultValue: { value: ['OPT_IN'] },
          visibility: { data: false, list: true, filters: true },
        },
        {
          handle: 'last_contacted_at',
          label: 'Last Contacted At',
          definitionHandle: 'system/last_contacted_at',
          required: false,
          system: true,
          visibility: { data: false, list: true, filters: true },
        },
      ],
    },
  ],

  // Communication channels with typed dependencies
  channels: [
    {
      handle: 'sms',
      name: 'SMS',
      icon: 'MessageSquare',
      tools: {
        send_message: 'send_sms',
      },
      // Typed dependencies - models this channel requires
      requires: [
        { model: 'phone_number' }, // INTERNAL - auto-created
        { model: 'contact', fields: ['phone'] }, // SHARED - user picks model + field
      ],
    },
  ],

  // Workflows with typed dependencies
  workflows: [
    {
      path: './workflows/send-templated-message.yml',
      handle: 'send-templated-message',
      // Typed dependencies - requires SMS channel to be enabled
      requires: [{ channel: 'sms' }],
      actions: [
        {
          label: 'Send templated message',
          handle: 'send-templated-sms-message',
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
    },
  ],

  preInstall: {
    env: {
      TWILIO_ACCOUNT_SID: {
        label: 'Twilio Account SID',
        required: true,
        visibility: 'encrypted',
        description: 'Your Twilio Account SID from the Twilio Console',
        placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      },
      TWILIO_AUTH_TOKEN: {
        label: 'Twilio Auth Token',
        required: true,
        visibility: 'encrypted',
        description: 'Your Twilio Auth Token from the Twilio Console',
        placeholder: 'Your auth token',
      },
    },
  },

  install: {
    handler: import('./src/install'),
  },

  postInstall: {
    env: {
      TWILIO_CALL_FORWARD_USERNAME: {
        label: 'Call Forward Username',
        required: false,
        visibility: 'encrypted',
        description: 'Username for call forwarding authentication',
        placeholder: 'Optional username',
      },
      TWILIO_CALL_FORWARD_PASSWORD: {
        label: 'Call Forward Password',
        required: false,
        visibility: 'encrypted',
        description: 'Password for call forwarding authentication',
        placeholder: 'Optional password',
      },
    },
  },
})
