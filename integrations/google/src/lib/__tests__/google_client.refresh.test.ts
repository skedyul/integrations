import { beforeEach, describe, expect, it, jest } from '@jest/globals'

const refreshAccessToken = jest.fn<
  () => Promise<{
    credentials: {
      access_token?: string
      refresh_token?: string
      expiry_date?: number
    }
  }>
>()
const setCredentials = jest.fn<(credentials: unknown) => void>()

class FakeOAuth2 {
  setCredentials(credentials: unknown) {
    setCredentials(credentials)
  }

  refreshAccessToken() {
    return refreshAccessToken()
  }
}

jest.unstable_mockModule('googleapis', () => ({
  google: {
    auth: {
      OAuth2: FakeOAuth2,
    },
  },
}))

const {
  accessTokenNeedsRefresh,
  getAuthenticatedOAuthClient,
  refreshGoogleAccessToken,
} = await import('../google_client')
const { AppAuthInvalidError, TokenRefreshRequiredError } = await import('skedyul')

const oauthEnv = {
  GOOGLE_CLIENT_ID: 'client-id',
  GOOGLE_CLIENT_SECRET: 'client-secret',
  GOOGLE_REFRESH_TOKEN: 'stored-refresh',
  GOOGLE_ACCESS_TOKEN: 'stored-access',
  GOOGLE_TOKEN_EXPIRY: new Date(Date.now() + 10 * 60_000).toISOString(),
}

describe('getAuthenticatedOAuthClient', () => {
  beforeEach(() => {
    refreshAccessToken.mockReset()
    setCredentials.mockReset()
  })

  it('does not call Google when the access token is missing or near expiry', async () => {
    await expect(
      getAuthenticatedOAuthClient({
        ...oauthEnv,
        GOOGLE_ACCESS_TOKEN: undefined,
      }),
    ).rejects.toBeInstanceOf(TokenRefreshRequiredError)

    await expect(
      getAuthenticatedOAuthClient({
        ...oauthEnv,
        GOOGLE_TOKEN_EXPIRY: new Date(Date.now() + 30_000).toISOString(),
      }),
    ).rejects.toMatchObject({
      name: 'TokenRefreshRequiredError',
      tokenKey: 'GOOGLE_ACCESS_TOKEN',
    })

    expect(refreshAccessToken).not.toHaveBeenCalled()
    expect(setCredentials).not.toHaveBeenCalled()
  })

  it('marks a missing refresh token as auth invalid', async () => {
    await expect(
      getAuthenticatedOAuthClient({
        ...oauthEnv,
        GOOGLE_REFRESH_TOKEN: undefined,
      }),
    ).rejects.toBeInstanceOf(AppAuthInvalidError)
    expect(refreshAccessToken).not.toHaveBeenCalled()
  })

  it('uses a still-valid access token without refreshing', async () => {
    const { tokens } = await getAuthenticatedOAuthClient(oauthEnv)
    expect(tokens.accessToken).toBe('stored-access')
    expect(refreshAccessToken).not.toHaveBeenCalled()
    expect(setCredentials).toHaveBeenCalledWith({
      access_token: 'stored-access',
      refresh_token: 'stored-refresh',
      expiry_date: expect.any(Number),
    })
  })
})

describe('accessTokenNeedsRefresh', () => {
  it('treats a token inside the 60 second window as expired', () => {
    const now = Date.parse('2026-10-07T04:00:00.000Z')
    expect(
      accessTokenNeedsRefresh(
        {
          GOOGLE_ACCESS_TOKEN: 'access',
          GOOGLE_TOKEN_EXPIRY: '2026-10-07T04:00:30.000Z',
        },
        now,
      ),
    ).toBe(true)
    expect(
      accessTokenNeedsRefresh(
        {
          GOOGLE_ACCESS_TOKEN: 'access',
          GOOGLE_TOKEN_EXPIRY: '2026-10-07T04:02:00.000Z',
        },
        now,
      ),
    ).toBe(false)
  })
})

describe('refreshGoogleAccessToken', () => {
  beforeEach(() => {
    refreshAccessToken.mockReset()
    setCredentials.mockReset()
  })

  it('returns the new access token and a rotated refresh token', async () => {
    refreshAccessToken.mockResolvedValue({
      credentials: {
        access_token: 'ya29.new-access-token',
        refresh_token: '1//new-refresh-token',
        expiry_date: Date.parse('2026-10-07T04:22:00.000Z'),
      },
    })

    await expect(refreshGoogleAccessToken(oauthEnv)).resolves.toEqual({
      accessToken: 'ya29.new-access-token',
      refreshToken: '1//new-refresh-token',
      expiryDate: Date.parse('2026-10-07T04:22:00.000Z'),
    })
    expect(setCredentials).toHaveBeenCalledWith({
      refresh_token: 'stored-refresh',
    })
  })

  it('keeps the stored refresh token when Google does not rotate it', async () => {
    refreshAccessToken.mockResolvedValue({
      credentials: {
        access_token: 'ya29.new-access-token',
        expiry_date: Date.parse('2026-10-07T04:22:00.000Z'),
      },
    })

    const tokens = await refreshGoogleAccessToken(oauthEnv)
    expect(tokens.refreshToken).toBe('stored-refresh')
  })

  it('maps invalid_grant to auth invalid', async () => {
    refreshAccessToken.mockRejectedValue(new Error('invalid_grant'))
    await expect(refreshGoogleAccessToken(oauthEnv)).rejects.toBeInstanceOf(
      AppAuthInvalidError,
    )
  })

  it('maps Invalid Credentials to a refresh request', async () => {
    refreshAccessToken.mockRejectedValue(new Error('Invalid Credentials'))
    await expect(refreshGoogleAccessToken(oauthEnv)).rejects.toMatchObject({
      name: 'TokenRefreshRequiredError',
      tokenKey: 'GOOGLE_ACCESS_TOKEN',
    })
  })
})
