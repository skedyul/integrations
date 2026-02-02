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
          modelHandle: 'client',
          title: 'Client',
          description:
            '{% if resources.client.linked %}Linked to: {{ resources.client.targetName }}{% else %}Map the Petbooqz Client model to your existing data model.{% endif %}',
          status: '{% if resources.client.linked %}success{% else %}pending{% endif %}',
          statusText: '{% if resources.client.linked %}Configured{% else %}Not configured{% endif %}',
          buttonLabel: '{% if resources.client.linked %}Reconfigure{% else %}Configure{% endif %}',
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
          modelHandle: 'patient',
          title: 'Patient Model',
          description:
            '{% if resources.client.linked == false %}Configure Client mapping first.{% elsif resources.patient.linked %}Linked to: {{ resources.patient.targetName }}{% else %}Map the Petbooqz Patient model to your existing data model.{% endif %}',
          status: '{% if resources.client.linked == false %}warning{% elsif resources.patient.linked %}success{% else %}pending{% endif %}',
          statusText: '{% if resources.client.linked == false %}Requires Client{% elsif resources.patient.linked %}Configured{% else %}Not configured{% endif %}',
          buttonLabel: '{% if resources.patient.linked %}Reconfigure{% else %}Configure{% endif %}',
          buttonDisabled: '{% if resources.client.linked %}false{% else %}true{% endif %}',
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
          modelHandle: 'appointment',
          title: 'Appointment Model',
          description:
            '{% if resources.client.linked == false %}Configure Client mapping first.{% elsif resources.patient.linked == false %}Configure Patient mapping first.{% elsif resources.appointment.linked %}Linked to: {{ resources.appointment.targetName }}{% else %}Map the Petbooqz Appointment model to your existing data model.{% endif %}',
          status: '{% if resources.client.linked == false or resources.patient.linked == false %}warning{% elsif resources.appointment.linked %}success{% else %}pending{% endif %}',
          statusText: '{% if resources.client.linked == false %}Requires Client{% elsif resources.patient.linked == false %}Requires Patient{% elsif resources.appointment.linked %}Configured{% else %}Not configured{% endif %}',
          buttonLabel: '{% if resources.appointment.linked %}Reconfigure{% else %}Configure{% endif %}',
          buttonDisabled: '{% if resources.client.linked and resources.patient.linked %}false{% else %}true{% endif %}',
        },
      ],
    },
  ],
}

export default config
