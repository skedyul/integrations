/**
 * Environment Variables
 *
 * Provision-level environment variables for the Email app.
 */

import { defineEnv } from 'skedyul'

export default defineEnv({
  EMAIL_PROVIDER: {
    label: 'Email Provider',
    scope: 'provision',
    required: false,
    visibility: 'visible',
    description: 'The email service provider to use',
    placeholder: 'mailgun',
  },
  MAILGUN_API_KEY: {
    label: 'Mailgun API Key',
    scope: 'provision',
    required: true,
    visibility: 'encrypted',
    description: 'Your Mailgun API key from the Mailgun Dashboard',
    placeholder: 'key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  },
  MAILGUN_DOMAIN: {
    label: 'Mailgun Domain',
    scope: 'provision',
    required: true,
    visibility: 'visible',
    description: 'The Mailgun sending domain',
    placeholder: 'skedyul.app',
  },
  MAILGUN_SIGNING_SECRET: {
    label: 'Mailgun Webhook Signing Secret',
    scope: 'provision',
    required: true,
    visibility: 'encrypted',
    description: 'Webhook signing key for verifying inbound emails',
    placeholder: 'Your webhook signing key',
  },
})
