import { google } from 'googleapis'
import type { OAuth2Client } from 'google-auth-library'
import { AppAuthInvalidError } from 'skedyul'
import type { GoogleInstallEnv } from './google_install_env'
import { getDefaultOAuthScopes } from '../services/scopes'

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
    throw mapGoogleAuthError(error)
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

export async function revokeGoogleRefreshToken(refreshToken: string): Promise<void> {
  const client = createOAuth2Client({
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: '',
  })

  try {
    await client.revokeToken(refreshToken)
  } catch (error) {
    console.warn('[Google] Failed to revoke refresh token:', error)
  }
}

export function getTokenSetFromEnv(env: GoogleInstallEnv): GoogleTokenSet | null {
  const refreshToken = env.GOOGLE_REFRESH_TOKEN
  const accessToken = env.GOOGLE_ACCESS_TOKEN

  if (!refreshToken || !accessToken) {
    return null
  }

  const expiryRaw = env.GOOGLE_TOKEN_EXPIRY
  const expiryDate = expiryRaw ? Date.parse(expiryRaw) : null

  return {
    accessToken,
    refreshToken,
    expiryDate: Number.isFinite(expiryDate) ? expiryDate : null,
  }
}

export async function getAuthenticatedOAuthClient(
  env: GoogleInstallEnv,
): Promise<{ client: OAuth2Client; tokens: GoogleTokenSet }> {
  const config = requireGoogleOAuthConfig(env)
  const tokenSet = getTokenSetFromEnv(env)

  if (!tokenSet) {
    throw new AppAuthInvalidError('Google account is not connected')
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

  const expiry = tokenSet.expiryDate
  const needsRefresh = !expiry || expiry <= Date.now() + 60_000

  if (needsRefresh) {
    try {
      const { credentials } = await client.refreshAccessToken()
      if (!credentials.access_token) {
        throw new AppAuthInvalidError('Failed to refresh Google access token')
      }

      tokenSet.accessToken = credentials.access_token
      tokenSet.expiryDate = credentials.expiry_date ?? null
      client.setCredentials(credentials)
    } catch (error) {
      throw mapGoogleAuthError(error)
    }
  }

  return { client, tokens: tokenSet }
}

export function mapGoogleAuthError(error: unknown): Error {
  if (error instanceof AppAuthInvalidError) {
    return error
  }

  const message = error instanceof Error ? error.message : String(error)
  if (
    message.includes('invalid_grant') ||
    message.includes('Invalid Credentials') ||
    message.includes('401')
  ) {
    return new AppAuthInvalidError(message)
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
