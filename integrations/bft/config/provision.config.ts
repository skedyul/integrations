/**
 * Provision Configuration
 * =======================
 *
 * This file defines all resources that are automatically provisioned
 * when the app version is deployed.
 *
 * Sections:
 *   - models:        Data models with INTERNAL or SHARED scope
 *   - relationships: Links between models (one-to-many, etc.)
 *
 * Note: Per-install env vars (BFT_URL) are in install.config.ts
 */

import type { ProvisionConfig } from 'skedyul'

const config: ProvisionConfig = {
  // ─────────────────────────────────────────────────────────────────────────
  // Models
  // ─────────────────────────────────────────────────────────────────────────
  //
  // SHARED models are mapped to user's existing data during installation.
  // INTERNAL models are app-specific and not visible to users.
  //
  models: [
    {
      handle: 'package',
      name: 'Package',
      namePlural: 'Packages',
      scope: 'SHARED',
      labelTemplate: '{{ name }}',
      description: 'Membership packages and intro offers from BFT',
      fields: [
        {
          handle: 'name',
          label: 'Name',
          type: 'STRING',
          required: true,
          system: false,
          description: 'Package name',
          owner: 'APP',
        },
        {
          handle: 'description',
          label: 'Description',
          type: 'LONG_STRING',
          required: false,
          system: false,
          description: 'Package description',
          owner: 'APP',
        },
        {
          handle: 'price',
          label: 'Price',
          type: 'STRING',
          required: false,
          system: false,
          description: 'Price information',
          owner: 'APP',
        },
        {
          handle: 'type',
          label: 'Type',
          type: 'STRING',
          required: true,
          system: false,
          description: 'Package type: "package" or "intro_offer"',
          owner: 'APP',
        },
      ],
    },
    {
      handle: 'class',
      name: 'Class',
      namePlural: 'Classes',
      scope: 'SHARED',
      labelTemplate: '{{ name }}',
      description: 'Class types and descriptions from BFT',
      fields: [
        {
          handle: 'name',
          label: 'Name',
          type: 'STRING',
          required: true,
          system: false,
          description: 'Class name',
          owner: 'APP',
        },
        {
          handle: 'description',
          label: 'Description',
          type: 'LONG_STRING',
          required: false,
          system: false,
          description: 'Class description',
          owner: 'APP',
        },
        {
          handle: 'duration',
          label: 'Duration',
          type: 'STRING',
          required: false,
          system: false,
          description: 'Class duration',
          owner: 'APP',
        },
        {
          handle: 'category',
          label: 'Category',
          type: 'STRING',
          required: false,
          system: false,
          description: 'Class category',
          owner: 'APP',
        },
      ],
    },
    {
      handle: 'business_details',
      name: 'Business Details',
      namePlural: 'Business Details',
      scope: 'INTERNAL',
      labelTemplate: '{{ name }}',
      description: 'Business contact information for BFT club',
      fields: [
        {
          handle: 'name',
          label: 'Name',
          type: 'STRING',
          required: true,
          system: false,
          description: 'Business name',
          owner: 'APP',
        },
        {
          handle: 'club_id',
          label: 'Club ID',
          type: 'STRING',
          required: false,
          system: false,
          description: 'Parsed club identifier from URL',
          owner: 'APP',
        },
        {
          handle: 'address',
          label: 'Address',
          type: 'STRING',
          required: false,
          system: false,
          description: 'Business address',
          owner: 'APP',
        },
        {
          handle: 'phone',
          label: 'Phone',
          type: 'STRING',
          required: false,
          system: false,
          description: 'Phone number',
          owner: 'APP',
        },
        {
          handle: 'email',
          label: 'Email',
          type: 'STRING',
          required: false,
          system: false,
          description: 'Email address',
          owner: 'APP',
        },
        {
          handle: 'website_url',
          label: 'Website URL',
          type: 'STRING',
          required: false,
          system: false,
          description: 'Source website URL',
          owner: 'APP',
        },
      ],
    },
    {
      handle: 'prospect',
      name: 'Prospect',
      namePlural: 'Prospects',
      scope: 'SHARED',
      labelTemplate: '{{ stage }}',
      description: 'Sales cadence tracking for gym prospects',
      fields: [
        {
          handle: 'stage',
          label: 'Stage',
          type: 'STRING',
          required: true,
          system: false,
          description: 'Current stage in the sales cadence',
          owner: 'APP',
          defaultValue: { value: 'NEW_LEAD' },
          definition: {
            limitChoices: 1,
            options: [
              { label: 'New Lead', value: 'NEW_LEAD', color: 'blue' },
              { label: 'Contacted', value: 'CONTACTED', color: 'yellow' },
              { label: 'Trial Booked', value: 'TRIAL_BOOKED', color: 'orange' },
              { label: 'Trial Completed', value: 'TRIAL_COMPLETED', color: 'purple' },
              { label: 'Negotiation', value: 'NEGOTIATION', color: 'indigo' },
              { label: 'Won', value: 'WON', color: 'green' },
              { label: 'Lost', value: 'LOST', color: 'red' },
            ],
          },
        },
        {
          handle: 'source',
          label: 'Source',
          type: 'STRING',
          required: false,
          system: false,
          description: 'How the prospect found us',
          owner: 'APP',
          definition: {
            limitChoices: 1,
            options: [
              { label: 'Walk-in', value: 'WALK_IN' },
              { label: 'Website', value: 'WEBSITE' },
              { label: 'Referral', value: 'REFERRAL' },
              { label: 'Social Media', value: 'SOCIAL_MEDIA' },
              { label: 'Event', value: 'EVENT' },
              { label: 'BFT App', value: 'BFT_APP' },
              { label: 'Other', value: 'OTHER' },
            ],
          },
        },
        {
          handle: 'interest',
          label: 'Interest',
          type: 'STRING',
          required: false,
          system: false,
          description: 'What the prospect is interested in',
          owner: 'APP',
          definition: {
            limitChoices: 1,
            options: [
              { label: 'Membership', value: 'MEMBERSHIP' },
              { label: 'Intro Offer', value: 'INTRO_OFFER' },
              { label: 'Class Pass', value: 'CLASS_PASS' },
              { label: 'Group Training', value: 'GROUP_TRAINING' },
              { label: 'Personal Training', value: 'PERSONAL_TRAINING' },
              { label: 'Other', value: 'OTHER' },
            ],
          },
        },
        {
          handle: 'follow_up_date',
          label: 'Follow Up Date',
          type: 'DATE',
          required: false,
          system: false,
          description: 'Next scheduled follow-up date',
          owner: 'APP',
        },
        {
          handle: 'notes',
          label: 'Notes',
          type: 'LONG_STRING',
          required: false,
          system: false,
          description: 'Context about the conversation and prospect',
          owner: 'APP',
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────────────────
  // Relationships
  // ─────────────────────────────────────────────────────────────────────────
  relationships: [],

  // ─────────────────────────────────────────────────────────────────────────
  // Navigation
  // ─────────────────────────────────────────────────────────────────────────
  navigation: {
    sidebar: {
      sections: [
        {
          items: [
            { label: 'General', href: '/settings', icon: 'Settings' },
            { label: 'Packages', href: '/packages', icon: 'Package' },
            { label: 'Classes', href: '/classes', icon: 'BookOpen' },
            { label: 'Prospects', href: '/prospects', icon: 'UserPlus' },
          ],
        },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Pages
  // ─────────────────────────────────────────────────────────────────────────
  pages: [
    {
      type: 'INSTANCE',
      title: 'Packages',
      path: '/packages',
      default: true,
      navigation: true,
      blocks: [
        {
          type: 'model-mapper',
          model: 'package',
        },
        {
          type: 'card',
          restructurable: false,
          form: {
            formVersion: 'v2',
            id: 'sync-packages-form',
            fields: [
              {
                component: 'FieldSetting',
                id: 'sync_packages',
                row: 0,
                col: 0,
                props: {
                  label: 'Sync Packages',
                  description: 'Refresh packages from BFT',
                  mode: 'field',
                  button: {
                    label: 'Sync Packages',
                    variant: 'outline',
                    size: 'sm',
                    leftIcon: 'RefreshCw',
                  },
                },
                modalForm: {
                  header: {
                    title: 'Sync Packages',
                    description: 'This will refresh all packages from BFT.',
                  },
                  handler: 'sync_packages',
                  fields: [],
                },
              },
            ],
            layout: {
              type: 'form',
              rows: [
                { columns: [{ field: 'sync_packages', colSpan: 12 }] },
              ],
            },
          },
        },
      ],
    },
    {
      type: 'INSTANCE',
      title: 'Classes',
      path: '/classes',
      navigation: true,
      blocks: [
        {
          type: 'model-mapper',
          model: 'class',
        },
        {
          type: 'card',
          restructurable: false,
          form: {
            formVersion: 'v2',
            id: 'sync-classes-form',
            fields: [
              {
                component: 'FieldSetting',
                id: 'sync_classes',
                row: 0,
                col: 0,
                props: {
                  label: 'Sync Classes',
                  description: 'Refresh classes from BFT',
                  mode: 'field',
                  button: {
                    label: 'Sync Classes',
                    variant: 'outline',
                    size: 'sm',
                    leftIcon: 'RefreshCw',
                  },
                },
                modalForm: {
                  header: {
                    title: 'Sync Classes',
                    description: 'This will refresh all classes from BFT.',
                  },
                  handler: 'sync_classes',
                  fields: [],
                },
              },
            ],
            layout: {
              type: 'form',
              rows: [
                { columns: [{ field: 'sync_classes', colSpan: 12 }] },
              ],
            },
          },
        },
      ],
    },
    {
      type: 'INSTANCE',
      title: 'General',
      path: '/settings',
      navigation: true,
      context: {
        business_details: {
          model: 'business_details',
          mode: 'first',
          filters: {
            id: { eq: '{{ path_params.business_details_id }}' },
          },
        },
      },
      blocks: [
        {
          type: 'card',
          restructurable: false,
          header: {
            title: 'Business Details',
            description: 'Update business contact information',
          },
          form: {
            formVersion: 'v2',
            id: 'business-details-form',
            fields: [
              {
                component: 'Input',
                id: 'name',
                row: 0,
                col: 0,
                props: {
                  label: 'Name',
                  value: '{{ business_details.name }}',
                  placeholder: 'Enter business name',
                },
              },
              {
                component: 'Input',
                id: 'club_id',
                row: 1,
                col: 0,
                props: {
                  label: 'Club ID',
                  value: '{{ business_details.club_id }}',
                  placeholder: 'Enter club ID',
                },
              },
              {
                component: 'Input',
                id: 'address',
                row: 2,
                col: 0,
                props: {
                  label: 'Address',
                  value: '{{ business_details.address }}',
                  placeholder: 'Enter business address',
                },
              },
              {
                component: 'Input',
                id: 'phone',
                row: 3,
                col: 0,
                props: {
                  label: 'Phone',
                  value: '{{ business_details.phone }}',
                  placeholder: 'Enter phone number',
                },
              },
              {
                component: 'Input',
                id: 'email',
                row: 4,
                col: 0,
                props: {
                  label: 'Email',
                  value: '{{ business_details.email }}',
                  placeholder: 'Enter email address',
                },
              },
              {
                component: 'Input',
                id: 'website_url',
                row: 5,
                col: 0,
                props: {
                  label: 'Website URL',
                  value: '{{ business_details.website_url }}',
                  placeholder: 'Enter website URL',
                },
              },
            ],
            layout: {
              type: 'form',
              rows: [
                { columns: [{ field: 'name', colSpan: 12 }] },
                { columns: [{ field: 'club_id', colSpan: 12 }] },
                { columns: [{ field: 'address', colSpan: 12 }] },
                { columns: [{ field: 'phone', colSpan: 12 }] },
                { columns: [{ field: 'email', colSpan: 12 }] },
                { columns: [{ field: 'website_url', colSpan: 12 }] },
              ],
            },
            actions: [
              {
                handle: 'update_business_details',
                label: 'Update',
                handler: 'update_business_details',
                variant: 'primary',
              },
            ],
          },
        },
        {
          type: 'card',
          restructurable: false,
          form: {
            formVersion: 'v2',
            id: 'sync-all-form',
            fields: [
              {
                component: 'FieldSetting',
                id: 'sync_all',
                row: 0,
                col: 0,
                props: {
                  label: 'Sync All Data',
                  description: 'Refresh all data from BFT (packages, classes, and business details)',
                  mode: 'field',
                  button: {
                    label: 'Sync All',
                    variant: 'outline',
                    size: 'sm',
                    leftIcon: 'RefreshCw',
                  },
                },
                modalForm: {
                  header: {
                    title: 'Sync All Data',
                    description: 'This will refresh all data from BFT (packages, classes, and business details).',
                  },
                  handler: 'refresh_data',
                  fields: [],
                },
              },
            ],
            layout: {
              type: 'form',
              rows: [
                { columns: [{ field: 'sync_all', colSpan: 12 }] },
              ],
            },
          },
        },
      ],
    },
    {
      type: 'INSTANCE',
      title: 'Prospects',
      path: '/prospects',
      navigation: true,
      blocks: [
        {
          type: 'model-mapper',
          model: 'prospect',
        },
      ],
    },
  ],
}

export default config
