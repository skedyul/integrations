import { defineConfig } from 'skedyul'

export default defineConfig({
  // App metadata
  name: 'Petbooqz',
  version: '1.0.0',
  description: 'Petbooqz veterinary practice management integration.',

  // Runtime configuration
  computeLayer: 'serverless',

  // Paths
  tools: './src/registry.ts',
  workflows: './workflows',

  // Global/version-level env vars (baked into container)
  env: {
    LOG_LEVEL: {
      label: 'Log Level',
      required: false,
      visibility: 'visible',
      default: 'info',
    },
  },

  // Install-time configuration
  install: {
    // Per-install env vars (configured by user when installing)
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
    // Model mappings
    appModels: [
      { entityHandle: 'client', label: 'Client/Owner' },
      { entityHandle: 'patient', label: 'Patient/Pet' },
    ],
  },
})

