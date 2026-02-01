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
 */

import type { ProvisionConfig } from 'skedyul'

const config: ProvisionConfig = {
  // ─────────────────────────────────────────────────────────────────────────
  // Environment Variables
  // ─────────────────────────────────────────────────────────────────────────
  //
  // These are configured per-installation by the user when installing the app.
  // Values marked as 'encrypted' are securely stored.
  //
  env: {
    PETBOOQZ_BASE_URL: {
      label: 'Petbooqz API Base URL',
      required: true,
      visibility: 'visible',
      placeholder: 'http://example.com/petbooqz/ExternalAPI/yourpetpa/v1/',
      description: 'Base URL for the Petbooqz API endpoint',
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
      required: false,
      visibility: 'visible',
      description: 'Optional client practice identifier for multi-practice setups',
    },
  },

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
  ],
}

export default config
