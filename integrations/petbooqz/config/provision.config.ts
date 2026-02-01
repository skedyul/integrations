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
          type: 'card',
          restructurable: false,
          header: {
            title: 'Client Model Configuration',
            description:
              'Map the Petbooqz Client model to your existing data model.',
          },
          form: {
            formVersion: 'v2',
            id: 'client-model-config',
            fields: [
              {
                component: 'FieldSetting',
                id: 'client-mapping',
                row: 0,
                col: 0,
                props: {
                  label: 'Client Model Mapping',
                  description:
                    'Select which model and fields to use for syncing Petbooqz clients.',
                  mode: 'setting',
                  button: {
                    label: 'Configure',
                    variant: 'outline',
                    size: 'sm',
                  },
                },
                modalForm: {
                  header: {
                    title: 'Configure Client Mapping',
                    description:
                      'Select the model and fields to map for Petbooqz clients.',
                  },
                  handler: 'link_shared_model',
                  template: 'APP_MODEL_RESOURCE_INSTANCE_MAPPER',
                  templateParams: {
                    modelHandle: 'client',
                  },
                },
              },
            ],
            layout: {
              type: 'form',
              rows: [
                {
                  columns: [{ field: 'client-mapping', colSpan: 12 }],
                },
              ],
            },
          },
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
          type: 'card',
          restructurable: false,
          header: {
            title: 'Patient Model Configuration',
            description:
              'Map the Petbooqz Patient model to your existing data model.',
          },
          form: {
            formVersion: 'v2',
            id: 'patient-model-config',
            fields: [
              {
                component: 'FieldSetting',
                id: 'patient-mapping',
                row: 0,
                col: 0,
                props: {
                  label: 'Patient Model Mapping',
                  description:
                    'Select which model and fields to use for syncing Petbooqz patients.',
                  mode: 'setting',
                  button: {
                    label: 'Configure',
                    variant: 'outline',
                    size: 'sm',
                  },
                },
                modalForm: {
                  header: {
                    title: 'Configure Patient Mapping',
                    description:
                      'Select the model and fields to map for Petbooqz patients.',
                  },
                  handler: 'link_shared_model',
                  template: 'APP_MODEL_RESOURCE_INSTANCE_MAPPER',
                  templateParams: {
                    modelHandle: 'patient',
                  },
                },
              },
            ],
            layout: {
              type: 'form',
              rows: [
                {
                  columns: [{ field: 'patient-mapping', colSpan: 12 }],
                },
              ],
            },
          },
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
          type: 'card',
          restructurable: false,
          header: {
            title: 'Appointment Model Configuration',
            description:
              'Map the Petbooqz Appointment model to your existing data model.',
          },
          form: {
            formVersion: 'v2',
            id: 'appointment-model-config',
            fields: [
              {
                component: 'FieldSetting',
                id: 'appointment-mapping',
                row: 0,
                col: 0,
                props: {
                  label: 'Appointment Model Mapping',
                  description:
                    'Select which model and fields to use for syncing Petbooqz appointments.',
                  mode: 'setting',
                  button: {
                    label: 'Configure',
                    variant: 'outline',
                    size: 'sm',
                  },
                },
                modalForm: {
                  header: {
                    title: 'Configure Appointment Mapping',
                    description:
                      'Select the model and fields to map for Petbooqz appointments.',
                  },
                  handler: 'link_shared_model',
                  template: 'APP_MODEL_RESOURCE_INSTANCE_MAPPER',
                  templateParams: {
                    modelHandle: 'appointment',
                  },
                },
              },
            ],
            layout: {
              type: 'form',
              rows: [
                {
                  columns: [{ field: 'appointment-mapping', colSpan: 12 }],
                },
              ],
            },
          },
        },
      ],
    },
  ],
}

export default config
