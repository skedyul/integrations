import type { InstallHandlerContext, InstallHandlerResponseOAuth } from 'skedyul'
import {
  buildGoogleOAuthUrl,
  requireGoogleOAuthConfig,
} from '../../lib/google_client'
import {
  buildOAuthRedirectUri,
  type GoogleInstallEnv,
} from '../../lib/google_install_env'
import { getDefaultOAuthScopes } from '../../services/scopes'

export default async function install(
  ctx: InstallHandlerContext,
): Promise<InstallHandlerResponseOAuth> {
  const env = ctx.env as GoogleInstallEnv
  const oauthConfig = requireGoogleOAuthConfig(env)

  if (env.GOOGLE_REFRESH_TOKEN) {
    throw new Error(
      'This installation already has a Google account connected. Each installation supports one Google connection.',
    )
  }

  const redirectUri = buildOAuthRedirectUri(env, ctx.app.handle, ctx.app.versionHandle)
  const state = Buffer.from(
    JSON.stringify({
      appInstallationId: ctx.appInstallationId,
      workplace: ctx.workplace,
      app: ctx.app,
    }),
  ).toString('base64')

  const oauthUrl = buildGoogleOAuthUrl({
    config: {
      ...oauthConfig,
      redirectUri,
    },
    state,
    scopes: getDefaultOAuthScopes(),
  })

  ctx.log.info(
    `[Google Install] Redirecting workplace ${ctx.workplace.subdomain} to Google OAuth`,
  )

  return {
    redirect: oauthUrl,
  }
}
