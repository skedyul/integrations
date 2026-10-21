import type { InstallHandlerContext, InstallHandlerResponseOAuth } from 'skedyul'

export default async function install(
  ctx: InstallHandlerContext,
): Promise<InstallHandlerResponseOAuth> {
  const clientId = ctx.env.SLACK_CLIENT_ID || process.env.SLACK_CLIENT_ID
  if (!clientId) {
    throw new Error('SLACK_CLIENT_ID is required in provision environment variables.')
  }
  if (ctx.env.SLACK_BOT_TOKEN) {
    throw new Error('This installation already has a Slack workspace connected.')
  }

  const baseUrl = (ctx.env.SKEDYUL_API_URL || process.env.SKEDYUL_API_URL || '').replace(/\/+$/, '')
  const redirectUri = `${baseUrl}/api/callbacks/oauth/${ctx.app.handle}/${ctx.app.versionHandle}`
  const state = Buffer.from(
    JSON.stringify({
      appInstallationId: ctx.appInstallationId,
      workplace: ctx.workplace,
      app: ctx.app,
    }),
  ).toString('base64')

  const scopes = [
    'chat:write',
    'channels:history',
    'groups:history',
    'im:history',
    'mpim:history',
    'users:read',
    'users:read.email',
  ].join(',')

  const url = new URL('https://slack.com/oauth/v2/authorize')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('scope', scopes)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('state', state)

  return { redirect: url.toString() }
}
