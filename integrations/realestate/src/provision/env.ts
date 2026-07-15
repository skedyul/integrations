import { defineEnv } from 'skedyul'

export default defineEnv({
  REA_CLIENT_ID: {
    label: 'REA Client ID',
    scope: 'provision',
    required: true,
    visibility: 'encrypted',
    description: 'Partner Platform client ID from REA Customer Support',
    placeholder: 'BE9DA15F-F553-46AC-8453-55286A301C70',
  },
  REA_CLIENT_SECRET: {
    label: 'REA Client Secret',
    scope: 'provision',
    required: true,
    visibility: 'encrypted',
    description: 'Partner Platform client secret from REA Customer Support',
  },
  REA_API_BASE_URL: {
    label: 'REA API Base URL',
    scope: 'provision',
    required: false,
    visibility: 'visible',
    description: 'REA Partner Platform API base URL',
    placeholder: 'https://api.realestate.com.au',
    default: 'https://api.realestate.com.au',
  },
  REA_AGENCY_ID: {
    label: 'REA Agency ID',
    scope: 'install',
    required: true,
    visibility: 'visible',
    description:
      'Your realestate.com.au agency ID (6 uppercase letters). Your agency must authorize this partner integration with REA before install.',
    placeholder: 'ABCDEF',
  },
  REA_INTEGRATION_ID: {
    label: 'REA Integration ID',
    scope: 'install',
    required: false,
    visibility: 'system',
    description: 'REA integration ID validated at install time',
  },
  REA_SUBSCRIPTION_ID: {
    label: 'REA Subscription ID',
    scope: 'install',
    required: false,
    visibility: 'system',
    description: 'REA webhook subscription ID for this agency',
  },
})
