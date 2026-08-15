import type { InstallHandlerContext, InstallHandlerResponseOAuth } from 'skedyul'
import { buildGoogleInstallOAuthUrl } from '../../lib/google_oauth_redirect'
import type { GoogleInstallEnv } from '../../lib/google_install_env'

export default async function install(
  ctx: InstallHandlerContext,
): Promise<InstallHandlerResponseOAuth> {
  const env = ctx.env as GoogleInstallEnv
  const oauthUrl = buildGoogleInstallOAuthUrl({
    env,
    appHandle: ctx.app.handle,
    appVersionHandle: ctx.app.versionHandle,
    appInstallationId: ctx.appInstallationId,
    workplace: ctx.workplace,
  })

  ctx.log.info(
    `[Google Install] Redirecting workplace ${ctx.workplace.subdomain} to Google OAuth`,
  )

  return {
    redirect: oauthUrl,
  }
}
