import type { GoogleSyncDirection } from '../events/types'

export type GoogleConnectionStatus = 'connected' | 'pending' | 'error'

export interface GoogleInstallEnv {
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  GOOGLE_OAUTH_REDIRECT_URI?: string
  GOOGLE_REFRESH_TOKEN?: string
  GOOGLE_ACCESS_TOKEN?: string
  GOOGLE_TOKEN_EXPIRY?: string
  GOOGLE_ACCOUNT_EMAIL?: string
  GOOGLE_CONNECTION_STATUS?: GoogleConnectionStatus
  GOOGLE_ENABLED_SERVICES?: string
  SKEDYUL_API_URL?: string
}

export function getGoogleConnectionFromEnv(env: GoogleInstallEnv) {
  const status = env.GOOGLE_CONNECTION_STATUS ?? 'pending'
  const connected = Boolean(env.GOOGLE_REFRESH_TOKEN) && status === 'connected'

  return {
    email: env.GOOGLE_ACCOUNT_EMAIL ?? '',
    status,
    connected,
  }
}

export function requireGoogleRefreshToken(env: GoogleInstallEnv): string {
  const token = env.GOOGLE_REFRESH_TOKEN
  if (!token) {
    throw new Error('Google account is not connected. Complete the OAuth flow first.')
  }
  return token
}

export function buildOAuthRedirectUri(
  env: GoogleInstallEnv,
  appHandle: string,
  appVersionHandle: string,
): string {
  if (env.GOOGLE_OAUTH_REDIRECT_URI) {
    return env.GOOGLE_OAUTH_REDIRECT_URI
  }

  const baseUrl = (env.SKEDYUL_API_URL || process.env.SKEDYUL_API_URL || '').replace(/\/+$/, '')
  return `${baseUrl}/api/callbacks/oauth/${appHandle}/${appVersionHandle}`
}

export function parseSyncDirection(value: unknown): GoogleSyncDirection {
  if (value === 'push' || value === 'pull' || value === 'both') {
    return value
  }
  return 'both'
}
