import { buildGoogleOAuthUrl, requireGoogleOAuthConfig } from './google_client'
import {
  buildOAuthRedirectUri,
  type GoogleInstallEnv,
} from './google_install_env'
import { getDefaultOAuthScopes } from '../services/scopes'

const GOOGLE_APP_HANDLE = 'google'

export function inferGoogleVersionHandle(env: GoogleInstallEnv): string {
  const redirect = env.GOOGLE_OAUTH_REDIRECT_URI || ''
  const match = redirect.match(/\/api\/callbacks\/oauth\/google\/([^/?#]+)/)
  if (match?.[1]) {
    return match[1]
  }
  return 'prod'
}

export function buildGoogleInstallOAuthUrl(options: {
  env: GoogleInstallEnv
  appHandle?: string
  appVersionHandle?: string
  appInstallationId: string
  workplace: { id: string; subdomain: string }
}): string {
  const appHandle = options.appHandle || GOOGLE_APP_HANDLE
  const appVersionHandle = options.appVersionHandle || inferGoogleVersionHandle(options.env)
  const oauthConfig = requireGoogleOAuthConfig(options.env)
  const redirectUri = buildOAuthRedirectUri(options.env, appHandle, appVersionHandle)
  const state = Buffer.from(
    JSON.stringify({
      appInstallationId: options.appInstallationId,
      workplace: options.workplace,
      app: {
        handle: appHandle,
        versionHandle: appVersionHandle,
      },
    }),
  ).toString('base64')

  return buildGoogleOAuthUrl({
    config: {
      ...oauthConfig,
      redirectUri,
    },
    state,
    scopes: getDefaultOAuthScopes(),
  })
}
