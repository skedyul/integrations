/**
 * Install Configuration
 * =====================
 *
 * Defines per-install configuration including:
 * - env: Environment variables collected from user during install
 * - models: SHARED models mapped to user's existing data during installation
 *
 * Note: The install.ts handler parses the club name from the URL.
 */

import type { InstallConfig } from 'skedyul'

const config: InstallConfig = {
  // ─────────────────────────────────────────────────────────────────────────
  // Per-Install Environment Variables
  // ─────────────────────────────────────────────────────────────────────────
  //
  // These are collected from the user during installation.
  // They are stored encrypted per-installation and passed at runtime.
  //
  env: {
    BFT_URL: {
      label: 'BFT Club URL',
      required: true,
      visibility: 'visible',
      placeholder: 'https://www.bodyfittraining.au/club/braybrook',
      description:
        'Full URL to the BFT club page (e.g., https://www.bodyfittraining.au/club/braybrook)',
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SHARED Models
  // ─────────────────────────────────────────────────────────────────────────
  //
  // SHARED models are mapped to user's existing data during installation.
  //
  models: [
    {
      handle: 'package',
      name: 'Package',
      namePlural: 'Packages',
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
      handle: 'prospect',
      name: 'Prospect',
      namePlural: 'Prospects',
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
}

export default config
