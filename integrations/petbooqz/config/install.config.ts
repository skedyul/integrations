/**
 * Install Configuration
 * =====================
 *
 * Defines per-install configuration including:
 * - env: Environment variables collected from user during install
 * - models: SHARED models mapped to user's existing data during installation
 * - relationships: Links between SHARED models
 *
 * Note: The install.ts handler validates credentials and normalizes the base URL.
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
    PETBOOQZ_BASE_URL: {
      label: 'Petbooqz Server URL',
      required: true,
      visibility: 'visible',
      placeholder: '60.240.27.225:36680',
      description:
        'Server address for Petbooqz (e.g., 60.240.27.225:36680 or http://your-server.com)',
    },
    PETBOOQZ_USERNAME: {
      label: 'API Username',
      required: true,
      visibility: 'encrypted',
      description: 'Username for Petbooqz API authentication',
    },
    PETBOOQZ_PASSWORD: {
      label: 'API Password',
      required: true,
      visibility: 'encrypted',
      description: 'Password for Petbooqz API authentication',
    },
    PETBOOQZ_API_KEY: {
      label: 'API Key',
      required: true,
      visibility: 'encrypted',
      description: 'API key provided by Petbooqz',
    },
    PETBOOQZ_CLIENT_PRACTICE: {
      label: 'Client Practice ID',
      required: true,
      visibility: 'visible',
      description: 'Optional client practice identifier for multi-practice setups',
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
      handle: 'client',
      name: 'Client',
      namePlural: 'Clients',
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
}

export default config
