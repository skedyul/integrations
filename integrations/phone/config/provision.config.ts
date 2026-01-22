/**
 * Provision Configuration
 * =======================
 *
 * This file defines all resources that are automatically provisioned
 * when the app version is deployed. These resources are shared across
 * all installations of this app version.
 *
 * Sections:
 *   - env:           Environment variables (API keys, credentials)
 *   - models:        Data models with INTERNAL or SHARED scope
 *   - relationships: Links between models (one-to-many, etc.)
 *   - channels:      Communication channels (SMS, email, etc.)
 *   - workflows:     Automation templates
 *   - pages:         UI screens for the installed app
 *   - webhooks:      Provision-level webhook handlers
 *
 * Model Scopes:
 *   - INTERNAL: App owns this model. Data is created/managed by the app.
 *               Example: compliance_record, phone_number
 *   - SHARED:   User maps to their existing model during installation.
 *               Example: contact (maps to their Clients, Leads, etc.)
 *
 * Field Ownership:
 *   - APP:       App controls this field (e.g., status set by webhook)
 *   - WORKPLACE: User provides this data (e.g., business name input)
 *   - BOTH:      Either can update (collaborative)
 */

import type { ProvisionConfig } from 'skedyul'

const config: ProvisionConfig = {
  // ─────────────────────────────────────────────────────────────────────────
  // Environment Variables
  // ─────────────────────────────────────────────────────────────────────────
  //
  // These are configured by the developer (you) when setting up the app.
  // Values are encrypted and securely stored.
  // Users installing the app don't see or configure these.
  //
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

  // ─────────────────────────────────────────────────────────────────────────
  // Models
  // ─────────────────────────────────────────────────────────────────────────
  //
  // Data models used by this app.
  // INTERNAL models are created and owned by the app.
  // SHARED models are mapped to user's existing data during installation.
  //
  models: [
    // ───────────────────────────────────────────────────────────────────────
    // Compliance Record (INTERNAL)
    // ───────────────────────────────────────────────────────────────────────
    // Stores regulatory compliance information required by Twilio.
    // Must be APPROVED before phone numbers can be provisioned.
    //
    {
      handle: 'compliance_record',
      name: 'Compliance Record',
      namePlural: 'Compliance Records',
      scope: 'INTERNAL',
      labelTemplate: '{{ business_name }}',
      description: 'Regulatory compliance records for SMS/voice communication',
      fields: [
        // User-provided fields (WORKPLACE owner)
        {
          handle: 'business_name',
          label: 'Business Name',
          type: 'STRING',
          required: true,
          system: false,
          description: 'Legal name of the business',
          owner: 'WORKPLACE',
        },
        {
          handle: 'business_email',
          label: 'Business Email',
          type: 'STRING',
          required: true,
          system: false,
          description: 'Email address for compliance notifications',
          owner: 'WORKPLACE',
        },
        {
          handle: 'file',
          label: 'Evidence of Business Registration & Address',
          type: 'FILE',
          required: true,
          system: false,
          description: 'Upload business registration documentation',
          owner: 'WORKPLACE',
        },

        // App-managed fields (APP owner) - set by webhooks/tools
        {
          handle: 'status',
          label: 'Status',
          type: 'STRING',
          required: true,
          system: true,
          defaultValue: { value: 'PENDING' },
          description: 'Approval status of the compliance record',
          owner: 'APP',
          definition: {
            limitChoices: 1,
            options: [
              { label: 'Pending', value: 'PENDING', color: 'yellow' },
              { label: 'Submitted', value: 'SUBMITTED', color: 'blue' },
              { label: 'Pending Review', value: 'PENDING_REVIEW', color: 'orange' },
              { label: 'Approved', value: 'APPROVED', color: 'green' },
              { label: 'Rejected', value: 'REJECTED', color: 'red' },
            ],
          },
        },
        {
          handle: 'bundle_sid',
          label: 'Bundle SID',
          type: 'STRING',
          required: false,
          system: true,
          description: 'Twilio Regulatory Bundle SID',
          owner: 'APP',
        },
        {
          handle: 'end_user_sid',
          label: 'End User SID',
          type: 'STRING',
          required: false,
          system: true,
          description: 'Twilio End-User SID',
          owner: 'APP',
        },
        {
          handle: 'document_sid',
          label: 'Document SID',
          type: 'STRING',
          required: false,
          system: true,
          description: 'Twilio Supporting Document SID',
          owner: 'APP',
        },
        {
          handle: 'rejection_reason',
          label: 'Rejection Reason',
          type: 'STRING',
          required: false,
          system: true,
          description: 'Reason for rejection if compliance bundle was rejected',
          owner: 'APP',
        },
      ],
    },

    // ───────────────────────────────────────────────────────────────────────
    // Phone Number (INTERNAL)
    // ───────────────────────────────────────────────────────────────────────
    // Twilio phone numbers provisioned for the workplace.
    // Requires an APPROVED compliance record before provisioning.
    //
    {
      handle: 'phone_number',
      name: 'Phone Number',
      namePlural: 'Phone Numbers',
      scope: 'INTERNAL',
      labelTemplate: '{{ phone }}',
      description: 'Twilio phone numbers for SMS/voice communication',
      // Dependency: requires approved compliance record
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
          definitionHandle: 'phone', // Uses phone number validation/formatting
          required: true,
          unique: true,
          system: true,
          description: 'The Twilio phone number (E.164 format)',
          owner: 'APP', // Provisioned by app from Twilio
        },
        {
          handle: 'forwarding_phone_number',
          label: 'Forwarding Phone Number',
          type: 'STRING',
          definitionHandle: 'phone',
          required: false,
          system: false,
          description: 'Phone number to forward incoming calls to',
          owner: 'WORKPLACE', // User configures this
        },
      ],
    },

    // ───────────────────────────────────────────────────────────────────────
    // Contact (SHARED)
    // ───────────────────────────────────────────────────────────────────────
    // User maps to their existing contact/customer model during installation.
    // App adds system fields for SMS functionality.
    //
    {
      handle: 'contact',
      name: 'Contact',
      namePlural: 'Contacts',
      scope: 'SHARED',
      fields: [
        // User maps their existing phone field
        {
          handle: 'phone',
          label: 'Phone Number',
          definitionHandle: 'phone',
          required: true,
          system: false,
          unique: false,
          visibility: { data: true, list: true, filters: true },
          owner: 'WORKPLACE',
        },
        // App-managed opt-in status for SMS
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
        // App-managed last contacted timestamp
        {
          handle: 'last_contacted_at',
          label: 'Last Contacted At',
          definitionHandle: 'system/last_contacted_at',
          required: false,
          system: true,
          visibility: { data: false, list: true, filters: true },
          owner: 'APP', // Auto-updated when messages are sent
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────────────────
  // Relationships
  // ─────────────────────────────────────────────────────────────────────────
  //
  // Define links between models. Creates relationship fields on both sides.
  //
  relationships: [
    {
      // Phone numbers link to their compliance record
      // Many phone numbers can share one compliance record
      source: {
        model: 'phone_number',
        field: 'compliance_record',
        label: 'Compliance Record',
        cardinality: 'MANY_TO_ONE',
        onDelete: 'RESTRICT', // Can't delete compliance record with active phones
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

  // ─────────────────────────────────────────────────────────────────────────
  // Communication Channels
  // ─────────────────────────────────────────────────────────────────────────
  //
  // Channels enable sending/receiving messages through this app.
  // Each channel binds tools for sending and specifies required models.
  //
  channels: [
    {
      handle: 'sms',
      name: 'SMS',
      icon: 'MessageSquare',
      tools: {
        send_message: 'send_sms', // References tool from tools.config.ts
      },
      // Model dependencies for this channel
      requires: [
        { model: 'phone_number' }, // INTERNAL - app provisions
        { model: 'contact', fields: ['phone'] }, // SHARED - user maps phone field
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────────────────
  // Workflows
  // ─────────────────────────────────────────────────────────────────────────
  //
  // Automation templates that users can trigger.
  // YAML workflow files are in the workflows/ directory.
  //
  workflows: [
    {
      path: './workflows/send-templated-message.yml',
      handle: 'send-templated-message',
      // Requires SMS channel to be enabled
      requires: [{ channel: 'sms' }],
      actions: [
        {
          label: 'Send templated message',
          handle: 'send-templated-sms-message',
          batch: true, // Can process multiple contacts at once
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

  // ─────────────────────────────────────────────────────────────────────────
  // Pages
  // ─────────────────────────────────────────────────────────────────────────
  //
  // UI screens displayed in the installed app.
  // Pages are composed of blocks (form, spreadsheet, etc.) containing fields.
  //
  pages: [
    // ───────────────────────────────────────────────────────────────────────
    // Compliance Submission Page
    // ───────────────────────────────────────────────────────────────────────
    // Single-instance page for submitting compliance documents.
    //
    {
      handle: 'compliance_submission',
      type: 'INSTANCE', // Shows single record
      title: 'Compliance Submission',
      path: '/compliance',
      navigation: true, // Show in sidebar
      // Auto-load the compliance record for this installation
      filter: {
        model: 'compliance_record',
        where: { appInstallationId: '$appInstallationId' },
      },
      blocks: [
        {
          type: 'form',
          title: 'Business Registration',
          fields: [
            // FORM field type - opens modal with nested fields
            {
              handle: 'compliance_form',
              type: 'FORM',
              label: 'Submit Compliance Documents',
              description: 'Click to submit your business registration documents for Twilio compliance verification',
              handler: 'submit_compliance_document', // Tool to invoke on submit
              // Modal header
              header: {
                title: 'Business Registration',
                description: 'Provide your business details and upload supporting documents for Twilio regulatory compliance.',
              },
              // Nested fields in the modal
              fields: [
                {
                  handle: 'business_name',
                  type: 'STRING',
                  label: 'Business Name',
                  description: 'Legal name of your business',
                  required: true,
                },
                {
                  handle: 'business_email',
                  type: 'STRING',
                  label: 'Business Email',
                  description: 'Email address for compliance notifications from Twilio',
                  required: true,
                },
                {
                  handle: 'file',
                  type: 'FILE',
                  label: 'Business Registration Document',
                  description: 'Upload your business registration certificate (PDF, JPG, or PNG)',
                  required: true,
                  accept: '.pdf,.jpg,.jpeg,.png',
                },
              ],
              // Modal footer actions
              actions: [
                {
                  handle: 'submit',
                  label: 'Submit for Review',
                  handler: 'submit_compliance_document',
                  icon: 'Send',
                  variant: 'primary',
                },
              ],
            },
            // Read-only status display (populated from model)
            {
              handle: 'status',
              type: 'STRING',
              label: 'Compliance Status',
              description: 'Current status of your compliance submission',
              source: {
                model: 'compliance_record',
                field: 'status',
              },
            },
          ],
        },
      ],
      // Page-level action buttons
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

    // ───────────────────────────────────────────────────────────────────────
    // Phone Numbers List Page
    // ───────────────────────────────────────────────────────────────────────
    // List view of all provisioned phone numbers.
    //
    {
      handle: 'phone_numbers_list',
      type: 'LIST', // Shows multiple records
      title: 'Phone Numbers',
      path: '/phone-numbers',
      navigation: true, // Show in sidebar
      // Load phone numbers for this installation
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

  // ─────────────────────────────────────────────────────────────────────────
  // Provision-Level Webhooks
  // ─────────────────────────────────────────────────────────────────────────
  //
  // Webhook handlers to auto-register at provision level.
  // These are created when the app version is deployed and shared by all installations.
  // Handler implementations are defined in webhooks.config.ts.
  //
  // Note: 'compliance_status' is NOT listed here because it's ACTION-level -
  // created dynamically by the submit_compliance_document tool.
  //
  webhooks: ['receive_sms', 'receive_sms_v2'],
}

export default config
