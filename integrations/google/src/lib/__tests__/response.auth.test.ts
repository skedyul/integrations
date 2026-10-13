import { describe, expect, it } from '@jest/globals'
import { AppAuthInvalidError, TokenRefreshRequiredError } from 'skedyul'
import { googleAuthToolFailure } from '../response'

describe('googleAuthToolFailure', () => {
  it('returns TOKEN_REFRESH_REQUIRED with the access token key', () => {
    expect(
      googleAuthToolFailure(
        new TokenRefreshRequiredError('Access token expired', {
          tokenKey: 'GOOGLE_ACCESS_TOKEN',
        }),
      ),
    ).toMatchObject({
      success: false,
      error: {
        code: 'TOKEN_REFRESH_REQUIRED',
        message: 'Access token expired',
        category: 'auth',
        details: { tokenKey: 'GOOGLE_ACCESS_TOKEN' },
      },
    })
  })

  it('keeps a dead connection as an auth error', () => {
    expect(
      googleAuthToolFailure(new AppAuthInvalidError('invalid_grant')),
    ).toMatchObject({
      success: false,
      error: {
        code: 'AUTH_INVALID',
        message: 'invalid_grant',
      },
    })
  })
})
