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
 *   - channels:      Communication channels (WhatsApp, Instagram, Messenger)
 *   - workflows:     Automation templates
 *   - pages:         UI screens for the installed app
 *   - webhooks:      Provision-level webhook handlers
 *
 * Model Scopes:
 *   - INTERNAL: App owns this model. Data is created/managed by the app.
 *               Example: meta_connection, whatsapp_phone_number, facebook_page, instagram_account
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
    META_APP_ID: {
      label: 'Meta App ID',
      required: true,
      visibility: 'encrypted',
      description: 'Your Facebook App ID from the Meta App Dashboard',
      placeholder: '1234567890123456',
    },
    META_APP_SECRET: {
      label: 'Meta App Secret',
      required: true,
      visibility: 'encrypted',
      description: 'Your Facebook App Secret from the Meta App Dashboard',
      placeholder: 'Your app secret',
    },
    META_WEBHOOK_VERIFY_TOKEN: {
      label: 'Meta Webhook Verify Token',
      required: true,
      visibility: 'encrypted',
      description: 'Token for verifying webhook requests from Meta',
      placeholder: 'Your webhook verify token',
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
    // Meta Connection (INTERNAL)
    // ───────────────────────────────────────────────────────────────────────
    // Top-level model representing the OAuth connection to Meta.
    // One per installation. Created during OAuth callback.
    // Stores connection status and WABA information.
    //
    {
      handle: 'meta_connection',
      name: 'Meta Connection',
      namePlural: 'Meta Connections',
      scope: 'INTERNAL',
      labelTemplate: '{{ business_name || "Meta Connection" }}',
      description: 'OAuth connection to Meta (WhatsApp Business Account, Facebook Pages, Instagram)',
      fields: [
        {
          handle: 'waba_id',
          label: 'WhatsApp Business Account ID',
          type: 'STRING',
          required: false,
          system: true,
          description: 'Meta WhatsApp Business Account ID',
          owner: 'APP',
        },
        {
          handle: 'business_name',
          label: 'Business Name',
          type: 'STRING',
          required: false,
          system: true,
          description: 'Business name from Meta account',
          owner: 'APP',
        },
        {
          handle: 'status',
          label: 'Status',
          type: 'STRING',
          required: true,
          system: true,
          defaultValue: { value: 'PENDING' },
          description: 'Connection status of the Meta account',
          owner: 'APP',
          definition: {
            limitChoices: 1,
            options: [
              { label: 'Pending', value: 'PENDING', color: 'yellow' },
              { label: 'Connected', value: 'CONNECTED', color: 'green' },
              { label: 'Error', value: 'ERROR', color: 'red' },
            ],
          },
        },
      ],
    },

    // ───────────────────────────────────────────────────────────────────────
    // Facebook Page (INTERNAL)
    // ───────────────────────────────────────────────────────────────────────
    // Individual Facebook Pages connected to the Meta account.
    // Used for Messenger communication.
    //
    {
      handle: 'facebook_page',
      name: 'Facebook Page',
      namePlural: 'Facebook Pages',
      scope: 'INTERNAL',
      labelTemplate: '{{ name }}',
      description: 'Connected Facebook Pages for Messenger',
      // Dependency: requires meta connection
      requires: [
        {
          model: 'meta_connection',
          where: { status: { eq: 'CONNECTED' } },
        },
      ],
      fields: [
        {
          handle: 'page_id',
          label: 'Page ID',
          type: 'STRING',
          required: true,
          unique: true,
          system: true,
          description: 'Meta Graph API Page ID',
          owner: 'APP',
        },
        {
          handle: 'name',
          label: 'Page Name',
          type: 'STRING',
          required: true,
          system: true,
          description: 'Name of the Facebook Page',
          owner: 'APP',
        },
        {
          handle: 'access_token',
          label: 'Page Access Token',
          type: 'STRING',
          required: false,
          system: true,
          description: 'Page-specific access token for Messenger API',
          owner: 'APP',
        },
        {
          handle: 'category',
          label: 'Category',
          type: 'STRING',
          required: false,
          system: true,
          description: 'Page category from Meta',
          owner: 'APP',
        },
      ],
    },

    // ───────────────────────────────────────────────────────────────────────
    // Instagram Account (INTERNAL)
    // ───────────────────────────────────────────────────────────────────────
    // Individual Instagram Business accounts connected to the Meta account.
    // Used for Instagram Direct Messages.
    //
    {
      handle: 'instagram_account',
      name: 'Instagram Account',
      namePlural: 'Instagram Accounts',
      scope: 'INTERNAL',
      labelTemplate: '{{ username }}',
      description: 'Connected Instagram Business accounts for Direct Messages',
      // Dependency: requires meta connection
      requires: [
        {
          model: 'meta_connection',
          where: { status: { eq: 'CONNECTED' } },
        },
      ],
      fields: [
        {
          handle: 'instagram_account_id',
          label: 'Instagram Account ID',
          type: 'STRING',
          required: true,
          unique: true,
          system: true,
          description: 'Meta Graph API Instagram Business Account ID',
          owner: 'APP',
        },
        {
          handle: 'username',
          label: 'Username',
          type: 'STRING',
          required: true,
          system: true,
          description: 'Instagram username',
          owner: 'APP',
        },
        {
          handle: 'name',
          label: 'Account Name',
          type: 'STRING',
          required: false,
          system: true,
          description: 'Display name of the Instagram account',
          owner: 'APP',
        },
        {
          handle: 'profile_picture_url',
          label: 'Profile Picture URL',
          type: 'STRING',
          required: false,
          system: true,
          description: 'URL to the profile picture',
          owner: 'APP',
        },
      ],
    },

    // ───────────────────────────────────────────────────────────────────────
    // WhatsApp Phone Number (INTERNAL)
    // ───────────────────────────────────────────────────────────────────────
    // WhatsApp phone numbers from the connected WABA.
    // Requires a meta connection before provisioning.
    //
    {
      handle: 'whatsapp_phone_number',
      name: 'WhatsApp Phone Number',
      namePlural: 'WhatsApp Phone Numbers',
      scope: 'INTERNAL',
      labelTemplate: '{{ phone }}',
      description: 'WhatsApp phone numbers for messaging',
      // Dependency: requires meta connection
      requires: [
        {
          model: 'meta_connection',
          where: { status: { eq: 'CONNECTED' } },
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
          system: false,
          description: 'The WhatsApp phone number (E.164 format)',
          owner: 'APP',
        },
        {
          handle: 'phone_number_id',
          label: 'Phone Number ID',
          type: 'STRING',
          required: true,
          system: true,
          description: 'Meta Graph API phone number ID',
          owner: 'APP',
        },
        {
          handle: 'display_name',
          label: 'Display Name',
          type: 'STRING',
          required: false,
          system: true,
          description: 'Display name for this phone number',
          owner: 'APP',
        },
        {
          handle: 'quality_rating',
          label: 'Quality Rating',
          type: 'STRING',
          required: false,
          system: true,
          description: 'Meta quality rating for this number',
          owner: 'APP',
        },
        {
          handle: 'name',
          label: 'Name',
          type: 'STRING',
          required: false,
          system: false,
          description: 'A friendly name for this phone number',
          owner: 'WORKPLACE',
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
      // WhatsApp phone numbers link to their meta connection
      source: {
        model: 'whatsapp_phone_number',
        field: 'meta_connection',
        label: 'Meta Connection',
        cardinality: 'MANY_TO_ONE',
        onDelete: 'RESTRICT',
      },
      target: {
        model: 'meta_connection',
        field: 'whatsapp_phone_numbers',
        label: 'WhatsApp Phone Numbers',
        cardinality: 'ONE_TO_MANY',
        onDelete: 'NONE',
      },
    },
    {
      // Facebook pages link to their meta connection
      source: {
        model: 'facebook_page',
        field: 'meta_connection',
        label: 'Meta Connection',
        cardinality: 'MANY_TO_ONE',
        onDelete: 'RESTRICT',
      },
      target: {
        model: 'meta_connection',
        field: 'facebook_pages',
        label: 'Facebook Pages',
        cardinality: 'ONE_TO_MANY',
        onDelete: 'NONE',
      },
    },
    {
      // Instagram accounts link to their meta connection
      source: {
        model: 'instagram_account',
        field: 'meta_connection',
        label: 'Meta Connection',
        cardinality: 'MANY_TO_ONE',
        onDelete: 'RESTRICT',
      },
      target: {
        model: 'meta_connection',
        field: 'instagram_accounts',
        label: 'Instagram Accounts',
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
      handle: 'whatsapp',
      name: 'WhatsApp',
      icon: 'MessageSquare',

      // Field definitions for this channel. The phone field has identifier: true.
      fields: [
        {
          handle: 'phone',
          label: 'Phone',
          identifier: true,
          definition: {
            handle: 'phone',
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
          name: 'WhatsApp',
          icon: 'MessageSquare',
          receive: 'receive_whatsapp',
          send: 'send_whatsapp',
        },
      },
    },
  ],

  // ─────────────────────────────────────────────────────────────────────────
  // Navigation
  // ─────────────────────────────────────────────────────────────────────────
  //
  // Base navigation configuration for all pages.
  //
  navigation: {
    sidebar: {
      sections: [
        {
          items: [
            { label: 'Account', href: '/account', icon: 'Settings' },
            { label: 'WhatsApp Numbers', href: '/whatsapp-numbers', icon: 'MessageSquare' },
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
  //
  pages: [
    // ───────────────────────────────────────────────────────────────────────
    // Account Status Page
    // ───────────────────────────────────────────────────────────────────────
    // Shows OAuth connection status and account details.
    //
    {
      type: 'INSTANCE',
      title: 'Account',
      path: '/account',
      default: true,
      navigation: true,
      context: {
        meta_connection: {
          model: 'meta_connection',
          mode: 'first',
        },
      },
      blocks: [
        {
          type: 'card',
          restructurable: false,
          header: {
            title: 'Meta Account',
            description: 'View your connected Meta account status.',
          },
          form: {
            formVersion: 'v2',
            id: 'account-status-form',
            fields: [
              {
                component: 'Input',
                id: 'business_name',
                row: 0,
                col: 0,
                props: {
                  label: 'Business Name',
                  value: '{{ meta_connection.business_name }}',
                  disabled: true,
                },
              },
              {
                component: 'Input',
                id: 'status',
                row: 1,
                col: 0,
                props: {
                  label: 'Status',
                  value: '{{ meta_connection.status }}',
                  disabled: true,
                },
              },
            ],
            layout: {
              type: 'form',
              rows: [
                { columns: [{ field: 'business_name', colSpan: 12 }] },
                { columns: [{ field: 'status', colSpan: 12 }] },
              ],
            },
          },
        },
      ],
    },

    // ───────────────────────────────────────────────────────────────────────
    // WhatsApp Phone Numbers List Page
    // ───────────────────────────────────────────────────────────────────────
    // List view of all WhatsApp phone numbers from the connected WABA.
    //
    {
      type: 'LIST',
      title: 'WhatsApp Numbers',
      path: '/whatsapp-numbers',
      navigation: true,
      context: {
        meta_connection: {
          model: 'meta_connection',
          mode: 'first',
        },
        whatsapp_phone_numbers: {
          model: 'whatsapp_phone_number',
          mode: 'many',
        },
      },
      blocks: [
        {
          type: 'card',
          restructurable: false,
          form: {
            formVersion: 'v2',
            id: 'whatsapp-numbers-list-form',
            fields: [
              {
                component: 'List',
                id: 'whatsapp_numbers_list',
                row: 0,
                col: 0,
                iterable: '{{ whatsapp_phone_numbers }}',
                itemTemplate: {
                  component: 'ActionTile',
                  span: 12,
                  mdSpan: 12,
                  lgSpan: 12,
                  props: {
                    id: '{{ item.id }}',
                    label: '{{ item.phone }}',
                    description: '{{ item.display_name }}',
                    leftIcon: 'MessageSquare',
                    href: '/whatsapp-numbers/{{ item.id }}/overview',
                  },
                },
                props: {
                  title: 'WhatsApp Phone Numbers',
                  emptyMessage: 'No WhatsApp phone numbers found. Connect your Meta account to get started.',
                },
              },
            ],
            layout: {
              type: 'form',
              rows: [
                { columns: [{ field: 'whatsapp_numbers_list', colSpan: 12 }] },
              ],
            },
          },
        },
      ],
    },
  ],
}

export default config
