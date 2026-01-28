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
    GOOGLE_MAPS_API_KEY: {
      label: 'Google Maps API Key',
      required: true,
      visibility: 'encrypted',
      description: 'Google Maps API key for geocoding addresses (enable Geocoding API)',
      placeholder: 'AIzaSy...',
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
          handle: 'business_id',
          label: 'Business ID Number',
          type: 'STRING',
          required: true,
          system: false,
          description: 'Business registration or tax ID number',
          owner: 'WORKPLACE',
        },
        {
          handle: 'country',
          label: 'Country',
          type: 'STRING',
          required: true,
          system: false,
          description: 'Country where the business is registered',
          owner: 'WORKPLACE',
          definition: {
            limitChoices: 1,
            options: [
              { label: 'Australia', value: 'AU' },
            ],
          },
        },
        {
          handle: 'address',
          label: 'Business Address',
          type: 'STRING',
          required: true,
          system: false,
          description: 'Full business address (will be parsed automatically)',
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
          handle: 'address_sid',
          label: 'Address SID',
          type: 'STRING',
          required: false,
          system: true,
          description: 'Twilio Address SID (required for AU phone number purchases)',
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
      description: 'Phone numbers for SMS/voice communication',
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
          system: false, // Changed from true - system fields are skipped by createInstanceFlow
          description: 'The Phone number (E.164 format)',
          owner: 'APP', // Provisioned by app from Twilio
        },
        {
          handle: 'name',
          label: 'Name',
          type: 'STRING',
          required: false,
          system: false,
          description: 'A friendly name for this phone number',
          owner: 'WORKPLACE', // User can set a custom name
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
      handle: 'phone',
      name: 'Phone',
      icon: 'Phone',

      identifierField: {
        handle: 'phone',
        label: 'Phone',
        definition: {
          handle: 'phone',
        },
      },

      // Identifier field definition for filtering identifier fields (e.g., 'phone', 'email')
      fields: [
        {
          handle: 'phone',
          label: 'Phone',
          definition: {
            handle: 'phone'
          },
          visibility: {
            data: true,
            list: true,
            filters: true,
          },
        },
        {
          handle: 'opt_in',
          label: 'Opt In',
          definition: {
            handle: 'system/opt_in'
          },
          required: false,
          defaultValue: { value: ['OPT_IN'] },
          visibility: { data: true, list: true, filters: true },
          permissions: { read: true, write: true },
        },
        {
          handle: 'last_contacted_at',
          label: 'Last Contacted At',
          definition: {
            handle: 'system/last_contacted_at'
          },
          required: false,
          visibility: { data: false, list: true, filters: true },
          permissions: { read: true, write: false },
        }
      ],
      capabilities: {
        messaging: {
          name: 'SMS',
          icon: 'MessageSquare',
          receive: 'receive_sms',
          send: 'send_sms',
        },
        voice: {
          name: 'Voice',
          icon: 'Phone',
          receive: 'receive_call',
          send: 'make_call',
        },
      },
    }
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
  // Navigation
  // ─────────────────────────────────────────────────────────────────────────
  //
  // Base navigation configuration for all pages.
  // Individual pages can override this with their own navigation object.
  //
  navigation: {
    sidebar: {
      sections: [
        {
          // No section title - items appear directly in sidebar
          items: [
            { label: 'Compliance', href: '/compliance', icon: 'Shield' },
            { label: 'Phone Numbers', href: '/phone-numbers', icon: 'Phone' },
            { label: 'Contacts', href: '/contacts', icon: 'Users' },
          ],
        },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Pages
  // ─────────────────────────────────────────────────────────────────────────
  //
  // UI screens displayed in the installed app.
  // Pages use CardV2 + FormV2 structure for consistent rendering.
  // Blocks with type: 'card' use the new FormV2 component-based structure.
  //
  pages: [
    // ───────────────────────────────────────────────────────────────────────
    // Compliance Submission Page
    // ───────────────────────────────────────────────────────────────────────
    // Single-instance page for submitting compliance documents.
    //
    {
      type: 'INSTANCE',
      title: 'Compliance',
      path: '/compliance',
      default: true, // This is the landing page for the app installation
      navigation: true,
      context: {
        compliance_record: {
          model: 'compliance_record',
          mode: 'first',
        },
      },
      blocks: [
        {
          type: 'card',
          restructurable: false,
          form: {
            formVersion: 'v2',
            id: 'compliance-form',
            fields: [
              {
                component: 'FieldSetting',
                id: 'compliance_form',
                row: 0,
                col: 0,
                props: {
                  label: [
                    "{%- if compliance_record.bundle_sid != blank -%}",
                    "Submission: {{ compliance_record.bundle_sid | truncate: 16, '...' }}",
                    "{%- else -%}",
                    "Submit Compliance Documents",
                    "{%- endif -%}",
                  ].join(''),
                  description: [
                    "{%- if compliance_record == blank -%}",
                    "Click to submit your business registration documents for compliance verification",
                    "{%- elsif compliance_record.status == 'REJECTED' -%}",
                    "Rejected: {{ compliance_record.reject_reason | default: 'No reason provided' }}",
                    "{%- elsif compliance_record.status == 'PENDING' -%}",
                    "Your compliance documents are pending submission",
                    "{%- elsif compliance_record.status == 'SUBMITTED' -%}",
                    "Your documents have been submitted and are awaiting review",
                    "{%- elsif compliance_record.status == 'PENDING_REVIEW' -%}",
                    "Your documents are currently under review",
                    "{%- elsif compliance_record.status == 'APPROVED' -%}",
                    "Your compliance documents have been approved",
                    "{%- else -%}",
                    "Click to submit your business registration documents for compliance verification",
                    "{%- endif -%}",
                  ].join(''),
                  mode: 'field',
                  button: {
                    label: [
                      "{%- if compliance_record == blank -%}Submit Documents",
                      "{%- elsif compliance_record.status == 'PENDING' -%}Submit Documents",
                      "{%- elsif compliance_record.status == 'SUBMITTED' -%}Pending Review",
                      "{%- elsif compliance_record.status == 'PENDING_REVIEW' -%}Under Review",
                      "{%- elsif compliance_record.status == 'APPROVED' -%}Approved",
                      "{%- elsif compliance_record.status == 'REJECTED' -%}Resubmit",
                      "{%- else -%}Submit Documents",
                      "{%- endif -%}",
                    ].join(''),
                    variant: 'outline',
                    size: 'sm',
                    leftIcon: [
                      "{%- if compliance_record == blank -%}FileText",
                      "{%- elsif compliance_record.status == 'PENDING' -%}FileText",
                      "{%- elsif compliance_record.status == 'SUBMITTED' -%}Clock",
                      "{%- elsif compliance_record.status == 'PENDING_REVIEW' -%}Clock",
                      "{%- elsif compliance_record.status == 'APPROVED' -%}Check",
                      "{%- elsif compliance_record.status == 'REJECTED' -%}X",
                      "{%- else -%}FileText",
                      "{%- endif -%}",
                    ].join(''),
                  },
                },
                // Nested modal form (handled by skedyul-web)
                modalForm: {
                  header: {
                    title: 'Business Registration',
                    description: 'Provide your business details and upload supporting documents for regulatory compliance.',
                  },
                  handler: 'submit_compliance_document',
                  fields: [
                    {
                      component: 'Input',
                      id: 'business_name',
                      row: 0,
                      col: 0,
                      props: {
                        label: 'Business Name',
                        placeholder: 'ACME Pty Ltd',
                        helpText: 'The Legal name of your business.',
                        required: true,
                      },
                    },
                    {
                      component: 'Input',
                      id: 'business_id',
                      row: 0,
                      col: 1,
                      props: {
                        label: 'Business ID Number',
                        placeholder: 'Tax ID (e.g., EIN, ABN)',
                        helpText: 'The Business ID number is used to verify your business. eg. EIN, ABN, Company Number',
                        required: true,
                      },
                    },
                    {
                      component: 'Input',
                      id: 'business_email',
                      row: 1,
                      col: 0,
                      props: {
                        label: 'Business Email',
                        helpText: 'The Email address we\'ll notify you of the compliance status.',
                        placeholder: 'Email address for compliance notifications',
                        type: 'email',
                        required: true,
                      },
                    },
                    {
                      component: 'Select',
                      id: 'country',
                      row: 2,
                      col: 0,
                      props: {
                        label: 'Country',
                        placeholder: 'Select country',
                        helpText: 'The Country where your business is registered.',
                        items: [
                          { label: 'Australia', value: 'AU' },
                        ],
                      },
                    },
                    {
                      component: 'Input',
                      id: 'address',
                      row: 2,
                      col: 1,
                      props: {
                        label: 'Business Address',
                        placeholder: 'Full address (e.g., 123 Main St, Sydney)',
                        helpText: 'The Full business address (will be parsed automatically).',
                        required: true,
                      },
                    },
                    {
                      component: 'FileSetting',
                      id: 'file',
                      row: 3,
                      col: 0,
                      props: {
                        label: 'Business Registration Document',
                        description: 'Upload your commercial register excerpt or equivalent (PDF, JPG, or PNG)',
                        accept: '.pdf,.jpg,.jpeg,.png',
                        required: true,
                        button: {
                          label: 'Upload Document',
                          variant: 'outline',
                          size: 'sm',
                        },
                      },
                    },
                  ],
                  layout: {
                    type: 'form',
                    rows: [
                      { columns: [{ field: 'business_name', colSpan: 6 }, { field: 'business_id', colSpan: 6 }] },
                      { columns: [{ field: 'business_email', colSpan: 12 }] },
                      { columns: [{ field: 'country', colSpan: 6 }, { field: 'address', colSpan: 6 }] },
                      { columns: [{ field: 'file', colSpan: 12 }] },
                    ],
                  },
                  // Modal footer actions with Liquid templates
                  actions: [
                    {
                      handle: 'submit',
                      label: [
                        "{%- if compliance_record == blank -%}Submit",
                        "{%- else -%}Resubmit",
                        "{%- endif -%}",
                      ].join(''),
                      handler: 'submit_compliance_document',
                      icon: 'Send',
                      variant: 'primary',
                    },
                  ],
                },
              },
            ],
            layout: {
              type: 'form',
              rows: [
                { columns: [{ field: 'compliance_form', colSpan: 12 }] },
              ],
            },
          },
        },
      ],
      actions: [],
    },

    // ───────────────────────────────────────────────────────────────────────
    // Phone Numbers List Page
    // ───────────────────────────────────────────────────────────────────────
    // List view of all provisioned phone numbers.
    //
    {
      type: 'LIST',
      title: 'Phone Numbers',
      path: '/phone-numbers',
      navigation: true,
      context: {
        compliance_record: {
          model: 'compliance_record',
          mode: 'first',
        },
        phone_numbers: {
          model: 'phone_number',
          mode: 'many',
        },
      },
      blocks: [
        {
          type: 'card',
          restructurable: false,
          form: {
            formVersion: 'v2',
            id: 'new-phone-number-form',
            fields: [
              {
                component: 'FieldSetting',
                id: 'new_phone_number_form',
                row: 0,
                col: 0,
                props: {
                  label: 'Phone Number',
                  description: [
                    "{%- if compliance_record == blank -%}",
                    "Submit compliance documents before purchasing a phone number",
                    "{%- elsif compliance_record.status != 'APPROVED' -%}",
                    "Compliance must be approved before purchasing a phone number",
                    "{%- else -%}",
                    "Click to purchase a new phone number for your business",
                    "{%- endif -%}",
                  ].join(''),
                  mode: 'field',
                  button: {
                    label: 'Purchase New Number',
                    variant: 'outline',
                    size: 'sm',
                    isDisabled: [
                      "{%- if compliance_record == blank -%}true",
                      "{%- elsif compliance_record.status == 'APPROVED' -%}false",
                      "{%- else -%}true",
                      "{%- endif -%}",
                    ].join(''),
                  },
                },
                // Nested modal form (handled by skedyul-web)
                modalForm: {
                  header: {
                    title: 'New Phone Number',
                    description: 'Request a new phone number for your business.',
                  },
                  handler: 'submit_new_phone_number',
                  fields: [
                    {
                      component: 'Alert',
                      id: 'compliance_record_info',
                      row: 0,
                      col: 0,
                      props: {
                        title: 'Compliance',
                        description: [
                          '{{ compliance_record.business_name }} • ',
                          'ABN: {{ compliance_record.business_id }} • ',
                          '{{ compliance_record.address }}, {{ compliance_record.country }}',
                        ].join(''),
                        icon: 'Building2',
                        variant: 'default',
                      },
                    },
                    // Name input for the phone number
                    {
                      component: 'Input',
                      id: 'name',
                      row: 1,
                      col: 0,
                      props: {
                        label: 'Phone Name',
                        placeholder: 'e.g., Sales Line, Support Number',
                        helpText: 'A friendly name to identify this phone number',
                        required: false,
                      },
                    },
                    // Hidden field to pass the compliance_record instance ID
                    {
                      component: 'Input',
                      id: 'compliance_record',
                      row: 2,
                      col: 0,
                      props: {
                        type: 'hidden',
                        value: '{{ compliance_record.id }}',
                      },
                    },
                  ],
                  layout: {
                    type: 'form',
                    rows: [
                      { columns: [{ field: 'compliance_record_info', colSpan: 12 }] },
                      { columns: [{ field: 'name', colSpan: 12 }] },
                      // Hidden field doesn't need layout, but including for completeness
                      { columns: [{ field: 'compliance_record', colSpan: 0 }] },
                    ],
                  },
                  // Modal footer actions with Liquid templates
                  actions: [
                    {
                      handle: 'submit_new_phone_number',
                      label: "Purchase Phone Number",
                      handler: 'submit_new_phone_number',
                      icon: 'Phone',
                      variant: 'primary',
                      isDisabled: [
                        "{%- if compliance_record == blank -%}true",
                        "{%- elsif compliance_record.status == 'APPROVED' -%}false",
                        "{%- else -%}true",
                        "{%- endif -%}",
                      ].join(''),
                    },
                  ],
                },
              },
              // Phone numbers list as a field in the same card
              // Uses iterable + itemTemplate for server-side pre-rendering
              {
                component: 'List',
                id: 'phone_numbers_list',
                row: 1,
                col: 0,
                // Iterate over phone_numbers from page context (mode: 'many')
                iterable: '{{ phone_numbers }}',
                // Template for each item - {{ item.xyz }} resolves to each phone number's fields
                itemTemplate: {
                  component: 'ActionTile',
                  span: 12,
                  mdSpan: 12,
                  lgSpan: 12,
                  props: {
                    id: '{{ item.id }}',
                    label: '{{ item.phone }}',
                    description: '{{ item.forwarding_phone_number }}',
                    leftIcon: 'Phone',
                    href: '/phone-numbers/{{ item.id }}/overview',
                  },
                },
                props: {
                  title: 'Phone Numbers',
                  emptyMessage: 'No phone numbers registered yet.',
                },
              },
            ],
            layout: {
              type: 'form',
              rows: [
                { columns: [{ field: 'new_phone_number_form', colSpan: 12 }] },
                { columns: [{ field: 'phone_numbers_list', colSpan: 12 }] },
              ],
            },
          },
        },
      ],
    },

    // ───────────────────────────────────────────────────────────────────────
    // NOTE: Contacts Page has been removed - it's now auto-injected by the
    // core system for any app with channels defined. The page is rendered
    // from apps/web/src/app/[subdomain]/settings/apps/[appHandle]/install/[installId]/contacts/
    // ───────────────────────────────────────────────────────────────────────

    // ───────────────────────────────────────────────────────────────────────
    // Phone Number Detail Page
    // ───────────────────────────────────────────────────────────────────────
    // Detail view for a single phone number. Accessed via /phone-numbers/[id].
    // This page has a navigation override to show instance-specific sidebar.
    //
    {
      type: 'INSTANCE',
      title: 'Phone Number',
      path: '/phone-numbers/[phone_id]/overview',
      // Navigation override: shows instance-specific navigation when on this page
      navigation: {
        sidebar: {
          sections: [
            {
              title: '{{ phone_number.phone }}',
              items: [
                { label: 'Overview', href: '/phone-numbers/{{ path_params.phone_id }}/overview', icon: 'Phone' },
                { label: 'Messaging', href: '/phone-numbers/{{ path_params.phone_id }}/messaging', icon: 'MessageSquare' },
                { label: 'Voice', href: '/phone-numbers/{{ path_params.phone_id }}/voice', icon: 'PhoneCall' },
              ],
            }
          ],
        },
        breadcrumb: {
          items: [
            { label: 'Phone Numbers', href: '/phone-numbers' },
            { label: '{{ phone_number.phone }}' },
          ],
        },
      },
      context: {
        phone_number: {
          model: 'phone_number',
          mode: 'first',
          filters: {
            id: { eq: '{{ path_params.phone_id }}' },
          },
        },
      },
      blocks: [
        {
          type: 'card',
          restructurable: false,
          header: {
            title: 'Phone Number Details',
            description: 'View and manage this phone number.',
          },
          form: {
            formVersion: 'v2',
            id: 'phone-number-detail-form',
            fields: [
              {
                component: 'Input',
                id: 'name',
                row: 1,
                col: 0,
                props: {
                  label: 'Name',
                  value: '{{ phone_number.name }}',
                  placeholder: 'Enter a friendly name for this number',
                },
              },
              {
                component: 'Input',
                id: 'phone',
                row: 0,
                col: 0,
                props: {
                  label: 'Phone Number',
                  value: '{{ phone_number.phone }}',
                  disabled: true,
                },
              },
            ],
            layout: {
              type: 'form',
              rows: [
                { columns: [{ field: 'phone', colSpan: 12 }] },
                { columns: [{ field: 'name', colSpan: 12 }] },
              ],
            },
          },
        },
        // Danger Zone card for destructive actions
        {
          type: 'card',
          restructurable: false,
          header: {
            title: 'Danger Zone',
            description: 'Irreversible actions for this phone number.',
          },
          form: {
            formVersion: 'v2',
            id: 'danger-zone-form',
            fields: [
              {
                component: 'FieldSetting',
                id: 'remove_phone_number',
                row: 0,
                col: 0,
                props: {
                  label: 'Remove Phone Number',
                  description: 'Permanently remove this phone number from your account.',
                  mode: 'setting',
                  button: {
                    label: 'Remove',
                    variant: 'destructive',
                  },
                },
                modalForm: {
                  header: {
                    title: 'Remove Phone Number',
                    description: 'This action cannot be undone.',
                  },
                  handler: 'remove_phone_number',
                  fields: [
                    {
                      component: 'Alert',
                      id: 'warning',
                      row: 0,
                      col: 0,
                      props: {
                        title: 'Are you sure?',
                        description: [
                          'Removing {{ phone_number.phone }} will:',
                          '',
                          '• Delete the SMS channel and all subscriptions',
                          '• Disconnect contacts from this channel',
                          '',
                          'Message history will be preserved. The Twilio number will be retained for potential transfer.',
                        ].join('\n'),
                        variant: 'destructive',
                        icon: 'AlertTriangle',
                      },
                    },
                    {
                      component: 'Input',
                      id: 'phone_number_id',
                      row: 1,
                      col: 0,
                      props: {
                        type: 'hidden',
                        value: '{{ phone_number.id }}',
                      },
                    },
                  ],
                  layout: {
                    type: 'form',
                    rows: [
                      { columns: [{ field: 'warning', colSpan: 12 }] },
                      { columns: [{ field: 'phone_number_id', colSpan: 0 }] },
                    ],
                  },
                  actions: [
                    {
                      handle: 'remove_phone_number',
                      label: 'Remove Phone Number',
                      handler: 'remove_phone_number',
                      icon: 'Trash2',
                      variant: 'destructive',
                    },
                  ],
                },
              },
            ],
            layout: {
              type: 'form',
              rows: [
                { columns: [{ field: 'remove_phone_number', colSpan: 12 }] },
              ],
            },
          },
        },
      ],
    },

    // ───────────────────────────────────────────────────────────────────────
    // Messaging Settings Page
    // ───────────────────────────────────────────────────────────────────────
    // Messaging configuration for this phone number.
    //
    {
      type: 'INSTANCE',
      title: 'Messaging',
      path: '/phone-numbers/[phone_id]/messaging',
      navigation: {
        sidebar: {
          sections: [
            {
              title: '{{ phone_number.phone }}',
              items: [
                { label: 'Overview', href: '/phone-numbers/{{ path_params.phone_id }}/overview', icon: 'Phone' },
                { label: 'Messaging', href: '/phone-numbers/{{ path_params.phone_id }}/messaging', icon: 'MessageSquare' },
                { label: 'Voice', href: '/phone-numbers/{{ path_params.phone_id }}/voice', icon: 'PhoneCall' },
              ],
            }
          ],
        },
        breadcrumb: {
          items: [
            { label: 'Phone Numbers', href: '/phone-numbers' },
            { label: '{{ phone_number.phone }}', href: '/phone-numbers/{{ path_params.phone_id }}' },
            { label: 'Messaging' },
          ],
        },
      },
      context: {
        phone_number: {
          model: 'phone_number',
          mode: 'first',
          filters: {
            id: { eq: '{{ path_params.phone_id }}' },
          },
        },
      },
      blocks: [
        {
          type: 'card',
          restructurable: false,
          header: {
            title: 'Messaging Settings',
            description: 'Configure messaging settings for this phone number.',
          },
          form: {
            formVersion: 'v2',
            id: 'messaging-settings-form',
            fields: [],
            layout: {
              type: 'form',
              rows: [],
            },
          },
        },
      ],
    },

    // ───────────────────────────────────────────────────────────────────────
    // Voice Settings Page
    // ───────────────────────────────────────────────────────────────────────
    // Voice/call forwarding configuration for this phone number.
    //
    {
      type: 'INSTANCE',
      title: 'Voice',
      path: '/phone-numbers/[phone_id]/voice',
      navigation: {
        sidebar: {
          sections: [
            {
              title: '{{ phone_number.phone }}',
              items: [
                { label: 'Overview', href: '/phone-numbers/{{ path_params.phone_id }}/overview', icon: 'Phone' },
                { label: 'Messaging', href: '/phone-numbers/{{ path_params.phone_id }}/messaging', icon: 'MessageSquare' },
                { label: 'Voice', href: '/phone-numbers/{{ path_params.phone_id }}/voice', icon: 'PhoneCall' },
              ],
            }
          ],
        },
        breadcrumb: {
          items: [
            { label: 'Phone Numbers', href: '/phone-numbers' },
            { label: '{{ phone_number.phone }}', href: '/phone-numbers/{{ path_params.phone_id }}' },
            { label: 'Voice' },
          ],
        },
      },
      context: {
        phone_number: {
          model: 'phone_number',
          mode: 'first',
          filters: {
            id: { eq: '{{ path_params.phone_id }}' },
          },
        },
      },
      blocks: [
        {
          type: 'card',
          restructurable: false,
          header: {
            title: 'Voice Settings',
            description: 'Configure call forwarding for this phone number.',
          },
          form: {
            formVersion: 'v2',
            id: 'voice-settings-form',
            fields: [
              {
                component: 'Input',
                id: 'forwarding_phone_number',
                row: 0,
                col: 0,
                props: {
                  label: 'Call Forwarding Number',
                  value: '{{ phone_number.forwarding_phone_number }}',
                  placeholder: 'Enter the number to forward calls to',
                },
              },
            ],
            layout: {
              type: 'form',
              rows: [
                { columns: [{ field: 'forwarding_phone_number', colSpan: 12 }] },
              ],
            },
          },
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
