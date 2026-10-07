import type { UninstallHandlerContext, UninstallHandlerResult } from 'skedyul'
import { deleteGoogleKeyedCrmRows } from '../../lib/cleanup-google-crm'
import { revokeGoogleRefreshToken } from '../../lib/google_client'
import type { GoogleInstallEnv } from '../../lib/google_install_env'

export default async function uninstall(
  ctx: UninstallHandlerContext,
): Promise<UninstallHandlerResult> {
  ctx.log.info('[Google Uninstall] Starting uninstall cleanup')

  const env = ctx.env as GoogleInstallEnv

  if (env.GOOGLE_REFRESH_TOKEN) {
    await revokeGoogleRefreshToken(env)
  }

  await deleteGoogleKeyedCrmRows(ctx.log)

  ctx.log.info('[Google Uninstall] Completed uninstall cleanup')
  return {}
}
