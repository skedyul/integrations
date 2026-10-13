import type { RefreshTokenHandler } from 'skedyul'
import { refreshGoogleAccessToken } from '../../lib/google_client'
import type { GoogleInstallEnv } from '../../lib/google_install_env'

const refreshTokenHandler: RefreshTokenHandler = async (ctx) => {
  const tokens = await refreshGoogleAccessToken(ctx.env as GoogleInstallEnv)
  const expiryDate = tokens.expiryDate ?? Date.now() + 3_600_000

  return {
    env: {
      GOOGLE_ACCESS_TOKEN: tokens.accessToken,
      GOOGLE_TOKEN_EXPIRY: new Date(expiryDate).toISOString(),
      ...(tokens.refreshToken && tokens.refreshToken !== ctx.env.GOOGLE_REFRESH_TOKEN
        ? { GOOGLE_REFRESH_TOKEN: tokens.refreshToken }
        : {}),
    },
  }
}

export default refreshTokenHandler
