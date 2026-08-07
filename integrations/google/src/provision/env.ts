import { defineEnv } from 'skedyul'

export default defineEnv({
  GOOGLE_CLIENT_ID: {
    label: 'Google Client ID',
    scope: 'provision',
    required: true,
    visibility: 'encrypted',
    description: 'OAuth 2.0 Client ID from Google Cloud Console',
    placeholder: '1234567890-abcdef.apps.googleusercontent.com',
  },
  GOOGLE_CLIENT_SECRET: {
    label: 'Google Client Secret',
    scope: 'provision',
    required: true,
    visibility: 'encrypted',
    description: 'OAuth 2.0 Client Secret from Google Cloud Console',
    placeholder: 'GOCSPX-...',
  },
  GOOGLE_OAUTH_REDIRECT_URI: {
    label: 'OAuth Redirect URI Override',
    scope: 'provision',
    required: false,
    visibility: 'visible',
    description:
      'Optional override for the OAuth redirect URI. Defaults to {SKEDYUL_API_URL}/api/callbacks/oauth/google/{versionHandle}',
  },
  GOOGLE_REFRESH_TOKEN: {
    label: 'Google Refresh Token',
    scope: 'install',
    required: false,
    visibility: 'encrypted',
    description: 'Long-lived refresh token set automatically after OAuth',
  },
  GOOGLE_ACCESS_TOKEN: {
    label: 'Google Access Token',
    scope: 'install',
    required: false,
    visibility: 'encrypted',
    description: 'Current access token refreshed automatically by the app',
  },
  GOOGLE_TOKEN_EXPIRY: {
    label: 'Google Token Expiry',
    scope: 'install',
    required: false,
    visibility: 'visible',
    description: 'ISO timestamp when the current access token expires',
  },
  GOOGLE_ACCOUNT_EMAIL: {
    label: 'Google Account Email',
    scope: 'install',
    required: false,
    visibility: 'visible',
    description: 'Connected Google account email address',
  },
  GOOGLE_CONNECTION_STATUS: {
    label: 'Google Connection Status',
    scope: 'install',
    required: false,
    visibility: 'visible',
    description: 'Connection status for the Google account on this installation',
    default: 'pending',
  },
  GOOGLE_ENABLED_SERVICES: {
    label: 'Enabled Google Services',
    scope: 'install',
    required: false,
    visibility: 'visible',
    description: 'JSON array of enabled services. v1 default: ["calendar"]',
    default: '["calendar"]',
  },
})
