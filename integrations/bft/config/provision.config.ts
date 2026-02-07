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
            { label: 'Packages', href: '/packages', icon: 'Package' },
            { label: 'Classes', href: '/classes', icon: 'BookOpen' },
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
      ],
    },
  ],
}

export default config
