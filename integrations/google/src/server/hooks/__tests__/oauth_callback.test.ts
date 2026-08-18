import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const setupComplete = jest.fn<(handle: string) => Promise<void>>()
const setupReconcile = jest.fn<() => Promise<void>>()
const exchangeCodeForTokens = jest.fn<() => Promise<{
  accessToken: string
  refreshToken: string
  expiryDate: number
}>>()
const fetchGoogleAccountEmail = jest.fn<() => Promise<string>>()
const createOAuth2Client = jest.fn(() => ({ setCredentials: jest.fn() }))

jest.unstable_mockModule('skedyul', () => ({
  setup: {
    complete: setupComplete,
    reconcile: setupReconcile,
  },
}))

jest.unstable_mockModule('../../../lib/google_client.ts', () => ({
  createOAuth2Client,
  exchangeCodeForTokens,
  fetchGoogleAccountEmail,
  requireGoogleOAuthConfig: () => ({
    clientId: 'client-id',
    clientSecret: 'client-secret',
  }),
  tokenSetToInstallEnv: () => ({
    GOOGLE_ACCESS_TOKEN: 'access',
    GOOGLE_REFRESH_TOKEN: 'refresh',
  }),
}))

jest.unstable_mockModule('../../../lib/google_install_env.ts', () => ({
  buildOAuthRedirectUri: () => 'https://api.example.com/callback',
}))

const { default: oauthCallback } = await import('../oauth_callback')

function encodeState() {
  return Buffer.from(
    JSON.stringify({
      appInstallationId: 'inst_1',
      app: { handle: 'google', versionHandle: 'prod' },
    }),
  ).toString('base64')
}

describe('oauthCallback', () => {
  beforeEach(() => {
    setupComplete.mockReset().mockResolvedValue(undefined)
    setupReconcile.mockReset().mockResolvedValue(undefined)
    exchangeCodeForTokens.mockReset().mockResolvedValue({
      accessToken: 'access',
      refreshToken: 'refresh',
      expiryDate: Date.now() + 3600_000,
    })
    fetchGoogleAccountEmail.mockReset().mockResolvedValue('user@example.com')
    process.env.GOOGLE_CLIENT_ID = 'client-id'
    process.env.GOOGLE_CLIENT_SECRET = 'client-secret'
    process.env.SKEDYUL_API_URL = 'https://api.example.com'
  })

  it('stores tokens only and does not seed calendars or start a batch', async () => {
    const result = await oauthCallback({
      request: {
        query: {
          code: 'auth-code',
          state: encodeState(),
        },
      },
      log: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
    } as never)

    expect(result).toEqual({
      appInstallationId: 'inst_1',
      env: {
        GOOGLE_ACCESS_TOKEN: 'access',
        GOOGLE_REFRESH_TOKEN: 'refresh',
      },
    })
    expect(setupComplete).toHaveBeenCalledWith('connect_google')
  })
})

describe('oauth_callback source', () => {
  it('does not import calendar seed, watches, or calendar_push registration', () => {
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '../oauth_callback.ts'),
      'utf8',
    )
    expect(source).not.toContain('run-install-backfill')
    expect(source).not.toContain('runPrimaryCalendarBackfill')
    expect(source).not.toContain('ensureInstallCalendarPushWebhook')
    expect(source).not.toContain('ensureCalendarWatch')
    expect(source).not.toContain('startAppBatchOperation')
    expect(source).not.toContain('upsertLinkedGoogleCalendars')
    expect(source).not.toContain('listGoogleCalendars')
    expect(source).not.toContain('withInstallationScope')
  })
})
