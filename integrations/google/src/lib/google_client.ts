import { google } from 'googleapis'
import type { OAuth2Client } from 'google-auth-library'
import { AppAuthInvalidError, TokenRefreshRequiredError } from 'skedyul'
import type { GoogleInstallEnv } from './google_install_env'
import { getDefaultOAuthScopes } from '../services/scopes'

export const GOOGLE_ACCESS_TOKEN_KEY = 'GOOGLE_ACCESS_TOKEN'

const ACCESS_TOKEN_REFRESH_WINDOW_MS = 60_000

export interface GoogleTokenSet {
  accessToken: string
  refreshToken: string
  expiryDate: number | null
}

export interface GoogleOAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri?: string
}

export function requireGoogleOAuthConfig(env: GoogleInstallEnv): GoogleOAuthConfig {
  const clientId = env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID
  const clientSecret = env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error(
      'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured on the app version.',
    )
  }

  return {
    clientId,
    clientSecret,
    redirectUri: env.GOOGLE_OAUTH_REDIRECT_URI || '',
  }
}

export function createOAuth2Client(config: GoogleOAuthConfig): OAuth2Client {
  return new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri || undefined)
}

export function buildGoogleOAuthUrl(options: {
  config: GoogleOAuthConfig
  state: string
  scopes?: string[]
}): string {
  const client = createOAuth2Client(options.config)
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: options.scopes ?? getDefaultOAuthScopes(),
    include_granted_scopes: true,
    state: options.state,
  })
}

export async function exchangeCodeForTokens(
  config: GoogleOAuthConfig,
  code: string,
): Promise<GoogleTokenSet> {
  const client = createOAuth2Client(config)

  try {
    const { tokens } = await client.getToken(code)

    if (!tokens.access_token) {
      throw new Error('Google OAuth did not return an access token')
    }

    if (!tokens.refresh_token) {
      throw new Error(
        'Google OAuth did not return a refresh token. Re-authorize with prompt=consent.',
      )
    }

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date ?? null,
    }
  } catch (error) {
    if (error instanceof AppAuthInvalidError) throw error
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('invalid_grant') || message.includes('401')) {
      throw new AppAuthInvalidError(message)
    }
    throw error instanceof Error ? error : new Error(message)
  }
}

export async function fetchGoogleAccountEmail(accessToken: string): Promise<string> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch Google account profile: ${response.status}`)
  }

  const data = (await response.json()) as { email?: string }
  if (!data.email) {
    throw new Error('Google account profile did not include an email address')
  }

  return data.email
}

export async function revokeGoogleRefreshToken(env: GoogleInstallEnv): Promise<void> {
  const refreshToken = env.GOOGLE_REFRESH_TOKEN
  if (!refreshToken) return

  const client = createOAuth2Client(requireGoogleOAuthConfig(env))

  try {
    await client.revokeToken(refreshToken)
  } catch (error) {
    console.warn('[Google] Failed to revoke refresh token:', error)
  }
}

export function accessTokenNeedsRefresh(env: GoogleInstallEnv, now = Date.now()): boolean {
  if (!env.GOOGLE_ACCESS_TOKEN) return true
  const expiry = env.GOOGLE_TOKEN_EXPIRY ? Date.parse(env.GOOGLE_TOKEN_EXPIRY) : NaN
  if (!Number.isFinite(expiry)) return true
  return expiry <= now + ACCESS_TOKEN_REFRESH_WINDOW_MS
}

export function getTokenSetFromEnv(env: GoogleInstallEnv): GoogleTokenSet | null {
  const refreshToken = env.GOOGLE_REFRESH_TOKEN
  const accessToken = env.GOOGLE_ACCESS_TOKEN

  if (!refreshToken || !accessToken || accessTokenNeedsRefresh(env)) {
    return null
  }

  const expiryDate = Date.parse(env.GOOGLE_TOKEN_EXPIRY ?? '')

  return {
    accessToken,
    refreshToken,
    expiryDate: Number.isFinite(expiryDate) ? expiryDate : null,
  }
}

export async function getAuthenticatedOAuthClient(
  env: GoogleInstallEnv,
): Promise<{ client: OAuth2Client; tokens: GoogleTokenSet }> {
  if (!env.GOOGLE_REFRESH_TOKEN) {
    throw new AppAuthInvalidError('Google account is not connected')
  }

  if (accessTokenNeedsRefresh(env)) {
    throw new TokenRefreshRequiredError('Access token expired', {
      tokenKey: GOOGLE_ACCESS_TOKEN_KEY,
    })
  }

  const config = requireGoogleOAuthConfig(env)
  const tokenSet = getTokenSetFromEnv(env)
  if (!tokenSet) {
    throw new TokenRefreshRequiredError('Access token expired', {
      tokenKey: GOOGLE_ACCESS_TOKEN_KEY,
    })
  }

  const client = createOAuth2Client({
    ...config,
    redirectUri: env.GOOGLE_OAUTH_REDIRECT_URI || config.redirectUri || undefined,
  })

  client.setCredentials({
    access_token: tokenSet.accessToken,
    refresh_token: tokenSet.refreshToken,
    expiry_date: tokenSet.expiryDate ?? undefined,
  })

  return { client, tokens: tokenSet }
}

export async function refreshGoogleAccessToken(
  env: GoogleInstallEnv,
): Promise<GoogleTokenSet> {
  const refreshToken = env.GOOGLE_REFRESH_TOKEN
  if (!refreshToken) {
    throw new AppAuthInvalidError('Google account is not connected')
  }

  const client = createOAuth2Client(requireGoogleOAuthConfig(env))
  client.setCredentials({ refresh_token: refreshToken })

  try {
    const { credentials } = await client.refreshAccessToken()
    if (!credentials.access_token) {
      throw new AppAuthInvalidError('Failed to refresh Google access token')
    }

    return {
      accessToken: credentials.access_token,
      refreshToken: credentials.refresh_token || refreshToken,
      expiryDate: credentials.expiry_date ?? Date.now() + 3_600_000,
    }
  } catch (error) {
    throw mapGoogleAuthError(error)
  }
}

export function mapGoogleAuthError(error: unknown): Error {
  if (error instanceof TokenRefreshRequiredError || error instanceof AppAuthInvalidError) {
    return error
  }

  const message = error instanceof Error ? error.message : String(error)
  if (message.includes('invalid_grant')) {
    return new AppAuthInvalidError(message)
  }
  if (message.includes('Invalid Credentials') || message.includes('401')) {
    return new TokenRefreshRequiredError(message, {
      tokenKey: GOOGLE_ACCESS_TOKEN_KEY,
    })
  }

  return error instanceof Error ? error : new Error(message)
}

export function tokenSetToInstallEnv(tokens: GoogleTokenSet, email: string) {
  return {
    GOOGLE_REFRESH_TOKEN: tokens.refreshToken,
    GOOGLE_ACCESS_TOKEN: tokens.accessToken,
    GOOGLE_TOKEN_EXPIRY: tokens.expiryDate
      ? new Date(tokens.expiryDate).toISOString()
      : '',
    GOOGLE_ACCOUNT_EMAIL: email,
    GOOGLE_CONNECTION_STATUS: 'connected' as const,
    GOOGLE_ENABLED_SERVICES: JSON.stringify(['calendar']),
  }
}
