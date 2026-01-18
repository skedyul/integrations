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
  // Unified model definitions (INTERNAL + SHARED)
  models: [
    {
      handle: 'compliance_record',
      name: 'Compliance Record',
      namePlural: 'Compliance Records',
      scope: 'INTERNAL', // App owns this, auto-created when feature is provisioned
      labelTemplate: '{{ file }}',
      description: 'Compliance records for SMS/voice communication',
      fields: [
        {
          handle: 'file',
          label: 'Evidence of Business Registration & Address',
          type: 'FILE',
          required: true,
          system: false,
          description: 'Upload your business registration documentation',
          owner: 'WORKPLACE', // User provides this file
        },
        {
          handle: 'status',
          label: 'Status',
          type: 'STRING',
          required: true,
          system: true,
          defaultValue: { value: 'PENDING' },
          description: 'Approval status of the compliance record',
          owner: 'APP', // App controls this (set via webhook callback)
          definition: {
            limitChoices: 1,
            options: [
              { label: 'Pending', value: 'PENDING', color: 'yellow' },
              { label: 'Approved', value: 'APPROVED', color: 'green' },
              { label: 'Rejected', value: 'REJECTED', color: 'red' },
            ],
          },
        },
      ],
    },
    {
      handle: 'phone_number',
      name: 'Phone Number',
      namePlural: 'Phone Numbers',
      scope: 'INTERNAL', // App owns this, auto-created when feature is provisioned
      labelTemplate: '{{ phone }}',
      description: 'Phone numbers assigned to workplaces for SMS/voice communication',
      // Requires an APPROVED compliance_record before phone numbers can be provisioned
      requires: [
        {
          model: 'compliance_record',
          where: { status: { eq: 'APPROVED' } },
        },
      ],
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
          owner: 'APP', // Provisioned by app (from Twilio)
        },
        {
          handle: 'forwarding_phone_number',
          label: 'Forwarding Phone Number',
          type: 'STRING',
          definitionHandle: 'phone',
          required: false,
          system: false,
          description: 'Phone number to forward calls to',
          owner: 'WORKPLACE', // User provides this
        },
        // Note: compliance_record relationship field is created automatically
        // by the relationship definition below
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
          owner: 'WORKPLACE', // User maps their existing phone field
        },
        {
          handle: 'opt_in',
          label: 'Opt In',
          definitionHandle: 'system/opt_in',
          required: false,
          system: true,
          defaultValue: { value: ['OPT_IN'] },
          visibility: { data: false, list: true, filters: true },
          owner: 'BOTH', // App can update, user can view/edit
        },
        {
          handle: 'last_contacted_at',
          label: 'Last Contacted At',
          definitionHandle: 'system/last_contacted_at',
          required: false,
          system: true,
          visibility: { data: false, list: true, filters: true },
          owner: 'APP', // App updates this automatically
        },
      ],
    },
  ],

  // Relationships between models
  relationships: [
    {
      // phone_number -> compliance_record (many phone numbers can link to one compliance record)
      source: {
        model: 'phone_number',
        field: 'compliance_record',
        label: 'Compliance Record',
        cardinality: 'MANY_TO_ONE',
        onDelete: 'RESTRICT',
      },
      target: {
        model: 'compliance_record',
        field: 'phone_numbers',
        label: 'Phone Numbers',
        cardinality: 'ONE_TO_MANY',
        onDelete: 'NONE',
      },
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

  // Pages (MVC View layer - displayed in post-install UI)
  pages: [
    {
      handle: 'compliance_submission',
      type: 'INSTANCE',
      title: 'Compliance Submission',
      path: '/compliance',
      navigation: true,
      // Filter to find the compliance record for this installation
      filter: {
        model: 'compliance_record',
        where: { appInstallationId: '$appInstallationId' },
      },
      blocks: [
        {
          type: 'form',
          title: 'Business Registration',
          fields: [
            {
              handle: 'file',
              type: 'FILE',
              label: 'Business Registration Document',
              description: 'Upload your business registration certificate (PDF, JPG, or PNG)',
              required: true,
              accept: '.pdf,.jpg,.jpeg,.png',
              // Data binding: prepopulate from model field
              source: {
                model: 'compliance_record',
                field: 'file',
              },
              // Handler called immediately on file upload
              handler: 'submit_compliance_document',
            },
            {
              handle: 'status',
              type: 'STRING',
              label: 'Compliance Status',
              description: 'Current status of your compliance submission',
              // Read-only field showing status from model (no handler)
              source: {
                model: 'compliance_record',
                field: 'status',
              },
            },
          ],
        },
      ],
      actions: [
        {
          handle: 'check_status',
          label: 'Refresh Status',
          handler: 'check_compliance_status',
          icon: 'RefreshCw',
          variant: 'secondary',
        },
      ],
    },
    {
      handle: 'phone_numbers_list',
      type: 'LIST',
      title: 'Phone Numbers',
      path: '/phone-numbers',
      navigation: true,
      // Filter to get phone numbers for this installation
      filter: {
        model: 'phone_number',
        where: { appInstallationId: '$appInstallationId' },
      },
      blocks: [
        {
          type: 'spreadsheet',
          title: 'All Phone Numbers',
          fields: [
            {
              handle: 'phone',
              type: 'STRING',
              label: 'Phone Number',
              description: 'The Twilio phone number',
              source: {
                model: 'phone_number',
                field: 'phone',
              },
            },
            {
              handle: 'forwarding_phone_number',
              type: 'STRING',
              label: 'Forwarding Number',
              description: 'Number to forward calls to',
              source: {
                model: 'phone_number',
                field: 'forwarding_phone_number',
              },
            },
          ],
        },
      ],
    },
  ],

  preInstall: {
    env: {
      
    },
  },

  install: {
    handler: import('./src/install'),
  },

  postInstall: {
    env: {

    },
  },
})
