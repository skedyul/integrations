import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const setupComplete = jest.fn<(handle: string) => Promise<void>>()
const setupReconcile = jest.fn<() => Promise<void>>()
const listGoogleCalendars = jest.fn<() => Promise<Array<{ calendar_id: string }>>>()
const upsertLinkedGoogleCalendars = jest.fn<
  (options: { emitEvents?: boolean }) => Promise<{ primaryCalendarId: string | null }>
>()
const exchangeCodeForTokens = jest.fn<() => Promise<{
  accessToken: string
  refreshToken: string
  expiryDate: number
}>>()
const fetchGoogleAccountEmail = jest.fn<() => Promise<string>>()
const createOAuth2Client = jest.fn(() => ({ setCredentials: jest.fn() }))
const withInstallationScope = jest.fn(async (_id: string, fn: () => Promise<void>) => fn())

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

jest.unstable_mockModule('../../../lib/installation_scope.ts', () => ({
  withInstallationScope,
}))

jest.unstable_mockModule('../../../services/calendar/client.ts', () => ({
  listGoogleCalendars,
}))

jest.unstable_mockModule('../../../lib/seed-google-calendars.ts', () => ({
  upsertLinkedGoogleCalendars,
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
    listGoogleCalendars.mockReset().mockResolvedValue([{ calendar_id: 'primary' }])
    upsertLinkedGoogleCalendars.mockReset().mockResolvedValue({ primaryCalendarId: 'primary' })
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

  it('seeds calendars quietly and does not start a batch, watch, or backfill', async () => {
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
    expect(upsertLinkedGoogleCalendars).toHaveBeenCalledTimes(1)
    expect(upsertLinkedGoogleCalendars.mock.calls[0]?.[0].emitEvents).toBe(false)
    expect(setupComplete).toHaveBeenCalledWith('connect_google')
    expect(withInstallationScope).toHaveBeenCalledTimes(1)
  })
})

describe('oauth_callback source', () => {
  it('does not import install backfill, watches, or calendar_push registration', () => {
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '../oauth_callback.ts'),
      'utf8',
    )
    expect(source).not.toContain('run-install-backfill')
    expect(source).not.toContain('runPrimaryCalendarBackfill')
    expect(source).not.toContain('ensureInstallCalendarPushWebhook')
    expect(source).not.toContain('ensureCalendarWatch')
    expect(source).not.toContain('startAppBatchOperation')
    expect(source).toContain('emitEvents: false')
  })
})
