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
    required: false,
    visibility: 'visible',
    description:
      'Optional. Your 6-letter realestate.com.au agency code (e.g. ABCDEF). Leave blank if your partner account has only one authorized agency — it will be detected automatically. Otherwise authorize your agency in Ignite first, then enter the code here.',
    placeholder: 'ABCDEF',
  },
})
