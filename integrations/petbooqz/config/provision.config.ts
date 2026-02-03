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
 * Note: Per-install env vars (API credentials) are in install.config.ts
 */

import type { ProvisionConfig } from 'skedyul'

const config: ProvisionConfig = {
  // ─────────────────────────────────────────────────────────────────────────
  // Models
  // ─────────────────────────────────────────────────────────────────────────
  //
  // SHARED models are mapped to user's existing data during installation.
  //
  models: [
    {
      handle: 'client',
      name: 'Client',
      namePlural: 'Clients',
      scope: 'SHARED',
      labelTemplate: '{{ first_name }} {{ last_name }}',
      description: 'Client/Owner records from Petbooqz',
      fields: [
        {
          handle: 'petbooqz_id',
          label: 'Petbooqz ID',
          type: 'STRING',
          required: false,
          system: true,
          description: 'External ID from Petbooqz system',
          owner: 'APP',
        },
      ],
    },
    {
      handle: 'patient',
      name: 'Patient',
      namePlural: 'Patients',
      scope: 'SHARED',
      labelTemplate: '{{ name }}',
      description: 'Patient/Pet records from Petbooqz',
      fields: [
        {
          handle: 'petbooqz_id',
          label: 'Petbooqz ID',
          type: 'STRING',
          required: false,
          system: true,
          description: 'External ID from Petbooqz system',
          owner: 'APP',
        },
      ],
    },
    {
      handle: 'appointment',
      name: 'Appointment',
      namePlural: 'Appointments',
      scope: 'SHARED',
      labelTemplate: '{{ title }}',
      description: 'Appointment records from Petbooqz',
      fields: [
        {
          handle: 'petbooqz_id',
          label: 'Petbooqz ID',
          type: 'STRING',
          required: false,
          system: true,
          description: 'External ID from Petbooqz system',
          owner: 'APP',
        },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────────────────
  // Relationships
  // ─────────────────────────────────────────────────────────────────────────
  relationships: [
    {
      source: {
        model: 'patient',
        field: 'owner',
        label: 'Owner',
        cardinality: 'MANY_TO_ONE',
        onDelete: 'RESTRICT',
      },
      target: {
        model: 'client',
        field: 'patients',
        label: 'Patients',
        cardinality: 'ONE_TO_MANY',
        onDelete: 'NONE',
      },
    },
    {
      source: {
        model: 'appointment',
        field: 'patient',
        label: 'Patient',
        cardinality: 'MANY_TO_ONE',
        onDelete: 'RESTRICT',
      },
      target: {
        model: 'patient',
        field: 'appointments',
        label: 'Appointments',
        cardinality: 'ONE_TO_MANY',
        onDelete: 'NONE',
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
            { label: 'Clients', href: '/clients', icon: 'Users' },
            { label: 'Patients', href: '/patients', icon: 'PawPrint' },
            { label: 'Appointments', href: '/appointments', icon: 'Calendar' },
          ],
        },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Pages
  // ─────────────────────────────────────────────────────────────────────────
  pages: [
    // ─────────────────────────────────────────────────────────────────────────
    // Clients Page - Configure Client Model Mapping
    // ─────────────────────────────────────────────────────────────────────────
    {
      type: 'INSTANCE',
      title: 'Clients',
      path: '/clients',
      default: true,
      navigation: true,
      blocks: [
        {
          type: 'model-mapper',
          model: 'client',
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Patients Page - Configure Patient Model Mapping
    // ─────────────────────────────────────────────────────────────────────────
    {
      type: 'INSTANCE',
      title: 'Patients',
      path: '/patients',
      navigation: true,
      blocks: [
        {
          type: 'model-mapper',
          model: 'patient',
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Appointments Page - Configure Appointment Model Mapping
    // ─────────────────────────────────────────────────────────────────────────
    {
      type: 'INSTANCE',
      title: 'Appointments',
      path: '/appointments',
      navigation: true,
      blocks: [
        {
          type: 'model-mapper',
          model: 'appointment',
        },
      ],
    },
  ],
}

export default config
