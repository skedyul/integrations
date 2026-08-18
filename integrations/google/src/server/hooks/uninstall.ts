import type { UninstallHandlerContext, UninstallHandlerResult } from 'skedyul'
import {
  getAuthenticatedOAuthClient,
  revokeGoogleRefreshToken,
} from '../../lib/google_client'
import type { GoogleInstallEnv } from '../../lib/google_install_env'

export default async function uninstall(
  ctx: UninstallHandlerContext,
): Promise<UninstallHandlerResult> {
  ctx.log.info('[Google Uninstall] Starting uninstall cleanup')

  const env = ctx.env as GoogleInstallEnv

  if (env.GOOGLE_REFRESH_TOKEN) {
    try {
      await getAuthenticatedOAuthClient(env)
    } catch (error) {
      ctx.log.warn('[Google Uninstall] Could not refresh Google client:', error)
    }
    await revokeGoogleRefreshToken(env.GOOGLE_REFRESH_TOKEN)
  }

  ctx.log.info('[Google Uninstall] Completed uninstall cleanup')
  return {}
}
