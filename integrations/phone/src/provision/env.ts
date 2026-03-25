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
  ENABLE_TEST_COMPLIANCE_AND_NUMBER: {
    label: 'Enable Test Mode',
    scope: 'provision',
    required: false,
    visibility: 'visible',
    description: 'When set to "true", uses hardcoded test responses instead of real Twilio API calls',
    placeholder: 'true',
  },
})
