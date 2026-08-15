import { describe, expect, it } from '@jest/globals'
import {
  buildGoogleInstallOAuthUrl,
  inferGoogleVersionHandle,
} from '../google_oauth_redirect'

describe('inferGoogleVersionHandle', () => {
  it('reads the version from an explicit redirect URI', () => {
    expect(
      inferGoogleVersionHandle({
        GOOGLE_OAUTH_REDIRECT_URI:
          'https://api.example.com/api/callbacks/oauth/google/staging',
      }),
    ).toBe('staging')
  })

  it('defaults to prod when the redirect URI is missing', () => {
    expect(inferGoogleVersionHandle({})).toBe('prod')
  })
})

describe('buildGoogleInstallOAuthUrl', () => {
  it('builds a Google OAuth URL with install state', () => {
    const url = buildGoogleInstallOAuthUrl({
      env: {
        GOOGLE_CLIENT_ID: 'client-id',
        GOOGLE_CLIENT_SECRET: 'client-secret',
        SKEDYUL_API_URL: 'https://api.example.com',
      },
      appHandle: 'google',
      appVersionHandle: 'dev',
      appInstallationId: 'inst_1',
      workplace: { id: 'wp_1', subdomain: 'acme' },
    })

    const parsed = new URL(url)
    expect(parsed.hostname).toBe('accounts.google.com')
    expect(parsed.searchParams.get('client_id')).toBe('client-id')
    expect(parsed.searchParams.get('access_type')).toBe('offline')
    const state = JSON.parse(
      Buffer.from(parsed.searchParams.get('state') || '', 'base64').toString('utf-8'),
    ) as { appInstallationId?: string; app?: { handle?: string } }
    expect(state.appInstallationId).toBe('inst_1')
    expect(state.app?.handle).toBe('google')
  })
})
