/**
 * Environment Variables
 *
 * Provision-level environment variables for the Meta app.
 */

import { defineEnv } from 'skedyul'

export default defineEnv({
  META_APP_ID: {
    label: 'Meta App ID',
    scope: 'provision',
    required: true,
    visibility: 'encrypted',
    description: 'Your Facebook App ID from the Meta App Dashboard',
    placeholder: '1234567890123456',
  },
  META_APP_SECRET: {
    label: 'Meta App Secret',
    scope: 'provision',
    required: true,
    visibility: 'encrypted',
    description: 'Your Facebook App Secret from the Meta App Dashboard',
    placeholder: 'Your app secret',
  },
  META_WEBHOOK_VERIFY_TOKEN: {
    label: 'Meta Webhook Verify Token',
    scope: 'provision',
    required: true,
    visibility: 'encrypted',
    description: "A secret token you create to verify webhook requests from Meta. Generate a secure random string (e.g., using openssl rand -hex 32) and use the same value in your Meta app's webhook settings.",
    placeholder: 'Generate a secure random token (e.g., openssl rand -hex 32)',
  },
  GRAPH_API_VERSION: {
    label: 'Graph API Version',
    scope: 'provision',
    required: true,
    visibility: 'visible',
    description: "Meta Graph API version to use (e.g., v21.0, v22.0). Check Meta's Graph API changelog for the latest stable version.",
    placeholder: 'v21.0',
  },
})
