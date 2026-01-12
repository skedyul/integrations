import { defineConfig } from 'skedyul'

export default defineConfig({
  name: 'Phone',
  version: '1.0.0',
  description: 'SMS and voice communication via Twilio',
  computeLayer: 'serverless',
  tools: import('./src/registry'),
  webhooks: import('./src/webhooks'),

  env: {    
    TWILIO_AUTH_TOKEN: {
      label: 'Twilio Auth Token',
      required: true,
      visibility: 'encrypted',
      description: 'Your Twilio Auth Token from the Twilio Console',
    },
    TWILIO_CALL_FORWARD_PASSWORD: {
      label: 'Twilio Call Forward Password',
      required: true,
      visibility: 'encrypted',
      description: 'Your Twilio Call Forward Password from the Twilio Console',
    },
    TWILIO_CALL_FORWARD_USERNAME: {
      label: 'Twilio Call Forward Username',
      required: true,
      visibility: 'encrypted',
      description: 'Your Twilio Call Forward Username from the Twilio Console',
    },
    TWILIO_ACCOUNT_SID: {
      label: 'Twilio Account SID',
      required: true,
      visibility: 'encrypted',
      description: 'Your Twilio Account SID from the Twilio Console',
    }
  },

  communicationChannels: [
    {
      handle: 'sms',
      name: 'SMS',
      icon: 'MessageSquare',
      tools: {
        send_message: 'send_sms',
      },
      identifierValue: {
        type: 'DEDICATED_PHONE',
        definitionHandle: 'phone',
      },
      appFields: [
        {
          label: 'Phone Number',
          fieldHandle: 'phone',
          entityHandle: 'contact',
          definitionHandle: 'phone',
          required: true,
          system: false,
          unique: false,
          visibility: { data: true, list: true, filters: true },
        },
        {
          label: 'Opt In',
          fieldHandle: 'opt_in',
          entityHandle: 'contact',
          definitionHandle: 'system/opt_in',
          required: false,
          system: true,
          defaultValue: { value: ['OPT_IN'] },
          visibility: { data: false, list: true, filters: true },
        },
        {
          label: 'Last Contacted At',
          fieldHandle: 'last_contacted_at',
          entityHandle: 'contact',
          definitionHandle: 'system/last_contacted_at',
          required: false,
          system: true,
          visibility: { data: false, list: true, filters: true },
        },
      ],
    },
  ],
  workflows: [
    {
      path: './workflows/send-templated-message.yml',
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

  install: {
    env: {
      // none yet..
    },
  },

  // Internal models owned by this app
  internalModels: [
    {
      handle: 'phone_number',
      name: 'Phone Number',
      namePlural: 'Phone Numbers',
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
  ],
})
