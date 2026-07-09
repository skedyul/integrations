/**
 * Environment Variables
 *
 * All environment variables with their scope:
 * - 'provision': Developer-configured, shared across all installations
 * - 'install': User-configured during app installation
 */

import { defineEnv } from 'skedyul'

export default defineEnv({
  TWILIO_ACCOUNT_SID: {
    label: 'Twilio Account SID',
    scope: 'provision',
    required: true,
    visibility: 'encrypted',
    description: 'Your Twilio Account SID from the Twilio Console',
    placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  },
  TWILIO_AUTH_TOKEN: {
    label: 'Twilio Auth Token',
    scope: 'provision',
    required: true,
    visibility: 'encrypted',
    description: 'Your Twilio Auth Token from the Twilio Console',
    placeholder: 'Your auth token',
  },
  TWILIO_CALL_FORWARD_USERNAME: {
    label: 'Call Forward Username',
    scope: 'provision',
    required: false,
    visibility: 'encrypted',
    description: 'Username for call forwarding authentication',
    placeholder: 'Optional username',
  },
  TWILIO_CALL_FORWARD_PASSWORD: {
    label: 'Call Forward Password',
    scope: 'provision',
    required: false,
    visibility: 'encrypted',
    description: 'Password for call forwarding authentication',
    placeholder: 'Optional password',
  },
  GOOGLE_MAPS_API_KEY: {
    label: 'Google Maps API Key',
    scope: 'provision',
    required: true,
    visibility: 'encrypted',
    description: 'Google Maps API key for geocoding addresses (enable Geocoding API)',
    placeholder: 'AIzaSy...',
  },
  TRANSCRIPTION_ENGINE: {
    label: 'Transcription Engine',
    scope: 'provision',
    required: false,
    visibility: 'visible',
    description:
      'Twilio Real-Time Transcription speech-to-text provider for calls ("deepgram" or "google"). Defaults to "deepgram".',
    placeholder: 'deepgram',
  },
  ENABLE_TEST_COMPLIANCE_AND_NUMBER: {
    label: 'Enable Test Mode (compliance)',
    scope: 'provision',
    required: false,
    visibility: 'visible',
    description:
      'When set to "true", uses hardcoded test responses for compliance submission and phone number provisioning (does not affect SMS sends)',
    placeholder: 'true',
  },
  MOCK_OUTBOUND_MESSAGES: {
    label: 'Mock outbound messages',
    scope: 'provision',
    required: false,
    visibility: 'visible',
    description:
      'When set to "true", SMS send tools skip Twilio and return mock success responses (safe for testing bulk and single sends)',
    placeholder: 'true',
  },
  COST_PER_SMS: {
    label: 'Cost per SMS (AUD)',
    scope: 'provision',
    required: false,
    visibility: 'visible',
    default: '0.07',
    description: 'Retail price per SMS segment in AUD (used for cost estimates and billing)',
    placeholder: '0.07',
  },
})
