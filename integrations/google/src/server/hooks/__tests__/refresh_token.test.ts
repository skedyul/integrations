import { beforeEach, describe, expect, it, jest } from '@jest/globals'

const refreshGoogleAccessToken = jest.fn<
  (env: { GOOGLE_REFRESH_TOKEN?: string }) => Promise<{
    accessToken: string
    refreshToken: string
    expiryDate: number | null
  }>
>()

jest.unstable_mockModule('../../../lib/google_client.ts', () => ({
  refreshGoogleAccessToken,
}))

const { default: refreshTokenHandler } = await import('../refresh_token')

describe('refresh_token hook', () => {
  beforeEach(() => {
    refreshGoogleAccessToken.mockReset()
  })

  it('returns access token env and omits an unrotated refresh token', async () => {
    refreshGoogleAccessToken.mockResolvedValue({
      accessToken: 'ya29.new-access-token',
      refreshToken: 'stored-refresh',
      expiryDate: Date.parse('2026-10-07T04:22:00.000Z'),
    })

    await expect(
      refreshTokenHandler({
        env: { GOOGLE_REFRESH_TOKEN: 'stored-refresh' },
      } as never),
    ).resolves.toEqual({
      env: {
        GOOGLE_ACCESS_TOKEN: 'ya29.new-access-token',
        GOOGLE_TOKEN_EXPIRY: '2026-10-07T04:22:00.000Z',
      },
    })
  })

  it('includes GOOGLE_REFRESH_TOKEN when Google rotates it', async () => {
    refreshGoogleAccessToken.mockResolvedValue({
      accessToken: 'ya29.new-access-token',
      refreshToken: '1//new-refresh-token',
      expiryDate: Date.parse('2026-10-07T04:22:00.000Z'),
    })

    const result = await refreshTokenHandler({
      env: { GOOGLE_REFRESH_TOKEN: 'stored-refresh' },
    } as never)

    expect(result.env).toMatchObject({
      GOOGLE_ACCESS_TOKEN: 'ya29.new-access-token',
      GOOGLE_REFRESH_TOKEN: '1//new-refresh-token',
    })
  })
})
