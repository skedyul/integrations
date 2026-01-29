/**
 * Provision Configuration
 * =======================
 *
 * This file defines all resources that are automatically provisioned
 * when the app version is deployed.
 *
 * Sections:
 *   - env:           Environment variables (API keys, credentials)
 *   - models:        Data models with INTERNAL or SHARED scope
 *   - relationships: Links between models (one-to-many, etc.)
 *   - channels:      Communication channels (email)
 *   - pages:         UI screens for the installed app
 *   - webhooks:      Provision-level webhook handlers
 */

import type { ProvisionConfig } from 'skedyul'

const config: ProvisionConfig = {
  // ─────────────────────────────────────────────────────────────────────────
  // Environment Variables
  // ─────────────────────────────────────────────────────────────────────────
  //
  // These are configured by the developer when setting up the app.
  // Values are encrypted and securely stored.
  //
  env: {
    EMAIL_PROVIDER: {
      label: 'Email Provider',
      required: false,
      visibility: 'visible',
      description: 'The email service provider to use',
      placeholder: 'mailgun',
    },
    MAILGUN_API_KEY: {
      label: 'Mailgun API Key',
      required: true,
      visibility: 'encrypted',
      description: 'Your Mailgun API key from the Mailgun Dashboard',
      placeholder: 'key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    },
    MAILGUN_DOMAIN: {
      label: 'Mailgun Domain',
      required: true,
      visibility: 'visible',
      description: 'The Mailgun sending domain',
      placeholder: 'skedyul.app',
    },
    MAILGUN_SIGNING_SECRET: {
      label: 'Mailgun Webhook Signing Secret',
      required: true,
      visibility: 'encrypted',
      description: 'Webhook signing key for verifying inbound emails',
      placeholder: 'Your webhook signing key',
    },
    MAILGUN_API_URL: {
      label: 'Mailgun API URL',
      required: false,
      visibility: 'visible',
      description: 'Mailgun API endpoint (use EU endpoint if needed)',
      placeholder: 'https://api.mailgun.net',
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Models
  // ─────────────────────────────────────────────────────────────────────────
  //
  // Data models used by this app.
  // INTERNAL models are created and owned by the app.
  //
  models: [
    // ───────────────────────────────────────────────────────────────────────
    // Email Domain (INTERNAL) - Placeholder for future custom domains
    // ───────────────────────────────────────────────────────────────────────
    // Stores domain configuration and verification status.
    // For now, only skedyul.app is supported.
    //
    {
      handle: 'email_domain',
      name: 'Email Domain',
      namePlural: 'Email Domains',
      scope: 'INTERNAL',
      labelTemplate: '{{ domain }}',
      description: 'Email domains for sending and receiving',
      fields: [
        {
          handle: 'domain',
          label: 'Domain',
          type: 'STRING',
          required: true,
          unique: true,
          system: true,
          description: 'The email domain (e.g., skedyul.app)',
          owner: 'APP',
        },
        {
          handle: 'type',
          label: 'Type',
          type: 'STRING',
          required: true,
          system: true,
          description: 'Domain type: system (skedyul.app) or custom',
          owner: 'APP',
          defaultValue: { value: 'SYSTEM' },
          definition: {
            limitChoices: 1,
            options: [
              { label: 'System', value: 'SYSTEM' },
              { label: 'Custom', value: 'CUSTOM' },
            ],
          },
        },
        {
          handle: 'status',
          label: 'Status',
          type: 'STRING',
          required: true,
          system: true,
          defaultValue: { value: 'ACTIVE' },
          description: 'Domain verification status',
          owner: 'APP',
          definition: {
            limitChoices: 1,
            options: [
              { label: 'Pending', value: 'PENDING', color: 'yellow' },
              { label: 'Verifying', value: 'VERIFYING', color: 'blue' },
              { label: 'Active', value: 'ACTIVE', color: 'green' },
              { label: 'Failed', value: 'FAILED', color: 'red' },
            ],
          },
        },
      ],
    },

    // ───────────────────────────────────────────────────────────────────────
    // Email Address (INTERNAL)
    // ───────────────────────────────────────────────────────────────────────
    // Individual email addresses that can send/receive.
    // Default: {subdomain}@skedyul.app
    //
    {
      handle: 'email_address',
      name: 'Email Address',
      namePlural: 'Email Addresses',
      scope: 'INTERNAL',
      labelTemplate: '{{ email }}',
      description: 'Email addresses for communication',
      fields: [
        {
          handle: 'email',
          label: 'Email Address',
          type: 'STRING',
          definitionHandle: 'email',
          required: true,
          unique: true,
          system: false,
          description: 'The email address',
          owner: 'APP',
        },
        {
          handle: 'name',
          label: 'Display Name',
          type: 'STRING',
          required: false,
          system: false,
          description: 'Friendly name shown in email From field',
          owner: 'WORKPLACE',
        },
        {
          handle: 'is_default',
          label: 'Default Address',
          type: 'BOOLEAN',
          required: false,
          system: true,
          defaultValue: { value: false },
          description: 'Whether this is the default sending address',
          owner: 'APP',
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────────────────
  // Relationships
  // ─────────────────────────────────────────────────────────────────────────
  //
  // Define links between models.
  //
  relationships: [
    {
      // Email addresses link to their domain
      source: {
        model: 'email_address',
        field: 'domain',
        label: 'Domain',
        cardinality: 'MANY_TO_ONE',
        onDelete: 'RESTRICT',
      },
      target: {
        model: 'email_domain',
        field: 'addresses',
        label: 'Addresses',
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
  //
  channels: [
    {
      handle: 'email',
      name: 'Email',
      icon: 'Mail',

      identifierField: {
        handle: 'email',
        label: 'Email',
        definition: {
          handle: 'email',
        },
      },

      fields: [
        {
          handle: 'email',
          label: 'Email',
          definition: {
            handle: 'email',
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
            handle: 'system/opt_in',
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
            handle: 'system/last_contacted_at',
          },
          required: false,
          visibility: { data: false, list: true, filters: true },
          permissions: { read: true, write: false },
        },
      ],

      capabilities: {
        messaging: {
          name: 'Email',
          icon: 'Mail',
          receive: 'receive_email',
          send: 'send_email',
        },
      },
    },
  ],

  // ─────────────────────────────────────────────────────────────────────────
  // Navigation
  // ─────────────────────────────────────────────────────────────────────────
  navigation: {
    sidebar: {
      sections: [
        {
          items: [
            { label: 'Addresses', href: '/addresses', icon: 'Mail' },
            { label: 'Domains', href: '/domains', icon: 'Globe' },
          ],
        },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Pages
  // ─────────────────────────────────────────────────────────────────────────
  pages: [
    // ───────────────────────────────────────────────────────────────────────
    // Email Addresses List Page
    // ───────────────────────────────────────────────────────────────────────
    {
      type: 'LIST',
      title: 'Email Addresses',
      path: '/addresses',
      default: true,
      navigation: true,
      context: {
        email_addresses: {
          model: 'email_address',
          mode: 'many',
        },
      },
      blocks: [
        {
          type: 'card',
          restructurable: false,
          header: {
            title: 'Email Addresses',
            description: 'Manage your email addresses for sending and receiving messages.',
          },
          form: {
            formVersion: 'v2',
            id: 'email-addresses-list',
            fields: [
              {
                component: 'List',
                id: 'addresses_list',
                row: 0,
                col: 0,
                iterable: '{{ email_addresses }}',
                itemTemplate: {
                  component: 'ActionTile',
                  span: 12,
                  mdSpan: 12,
                  lgSpan: 12,
                  props: {
                    id: '{{ item.id }}',
                    label: '{{ item.email }}',
                    description: '{{ item.name }}',
                    leftIcon: 'Mail',
                    href: '/addresses/{{ item.id }}',
                    badge: [
                      "{%- if item.is_default -%}Default{%- endif -%}",
                    ].join(''),
                  },
                },
                props: {
                  emptyMessage: 'No email addresses configured.',
                },
              },
            ],
            layout: {
              type: 'form',
              rows: [
                { columns: [{ field: 'addresses_list', colSpan: 12 }] },
              ],
            },
          },
        },
      ],
    },

    // ───────────────────────────────────────────────────────────────────────
    // Email Address Detail Page
    // ───────────────────────────────────────────────────────────────────────
    {
      type: 'INSTANCE',
      title: 'Email Address',
      path: '/addresses/[address_id]',
      navigation: {
        breadcrumb: {
          items: [
            { label: 'Addresses', href: '/addresses' },
            { label: '{{ email_address.email }}' },
          ],
        },
      },
      context: {
        email_address: {
          model: 'email_address',
          mode: 'first',
          filters: {
            id: { eq: '{{ path_params.address_id }}' },
          },
        },
      },
      blocks: [
        {
          type: 'card',
          restructurable: false,
          header: {
            title: 'Email Address Details',
            description: 'View and manage this email address.',
          },
          form: {
            formVersion: 'v2',
            id: 'email-address-detail',
            fields: [
              {
                component: 'Input',
                id: 'email',
                row: 0,
                col: 0,
                props: {
                  label: 'Email Address',
                  value: '{{ email_address.email }}',
                  disabled: true,
                },
              },
              {
                component: 'Input',
                id: 'name',
                row: 1,
                col: 0,
                props: {
                  label: 'Display Name',
                  value: '{{ email_address.name }}',
                  placeholder: 'Enter a display name for outgoing emails',
                },
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
                handle: 'save_email_details',
                label: 'Save',
                handler: 'update_email_address',
                variant: 'primary',
              },
            ],
          },
        },
      ],
    },

    // ───────────────────────────────────────────────────────────────────────
    // Domains List Page (placeholder for future)
    // ───────────────────────────────────────────────────────────────────────
    {
      type: 'LIST',
      title: 'Domains',
      path: '/domains',
      navigation: true,
      context: {
        email_domains: {
          model: 'email_domain',
          mode: 'many',
        },
      },
      blocks: [
        {
          type: 'card',
          restructurable: false,
          header: {
            title: 'Email Domains',
            description: 'Manage email domains for your organization.',
          },
          form: {
            formVersion: 'v2',
            id: 'email-domains-list',
            fields: [
              {
                component: 'Alert',
                id: 'system_domain_info',
                row: 0,
                col: 0,
                props: {
                  title: 'System Domain',
                  description: 'Your organization uses the skedyul.app domain for email. Custom domains will be available in a future update.',
                  icon: 'Info',
                  variant: 'default',
                },
              },
              {
                component: 'List',
                id: 'domains_list',
                row: 1,
                col: 0,
                iterable: '{{ email_domains }}',
                itemTemplate: {
                  component: 'ActionTile',
                  span: 12,
                  mdSpan: 12,
                  lgSpan: 12,
                  props: {
                    id: '{{ item.id }}',
                    label: '{{ item.domain }}',
                    description: '{{ item.type }}',
                    leftIcon: 'Globe',
                    badge: '{{ item.status }}',
                  },
                },
                props: {
                  emptyMessage: 'No domains configured.',
                },
              },
            ],
            layout: {
              type: 'form',
              rows: [
                { columns: [{ field: 'system_domain_info', colSpan: 12 }] },
                { columns: [{ field: 'domains_list', colSpan: 12 }] },
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
  webhooks: ['receive_email'],
}

export default config
