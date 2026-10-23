import type { OAuthCallbackContext, OAuthCallbackResult } from 'skedyul'
import { communicationChannel, getConfig, runWithConfig, token } from 'skedyul'
import { exchangeSlackCode } from '../../lib/slack_client'

export default async function oauthCallback(
  ctx: OAuthCallbackContext,
): Promise<OAuthCallbackResult> {
  const code = ctx.request.query.code
  if (!code) {
    throw new Error(ctx.request.query.error || 'Missing Slack authorization code')
  }

  let appInstallationId: string | undefined
  let appHandle: string | undefined
  let appVersionHandle: string | undefined
  if (ctx.request.query.state) {
    const state = JSON.parse(Buffer.from(ctx.request.query.state, 'base64').toString('utf8')) as {
      appInstallationId?: string
      app?: { handle?: string; versionHandle?: string }
    }
    appInstallationId = state.appInstallationId
    appHandle = state.app?.handle
    appVersionHandle = state.app?.versionHandle
  }
  if (!appInstallationId || !appHandle || !appVersionHandle) {
    throw new Error('Missing installation context in Slack OAuth state')
  }

  const clientId = process.env.SLACK_CLIENT_ID
  const clientSecret = process.env.SLACK_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('SLACK_CLIENT_ID and SLACK_CLIENT_SECRET must be configured')
  }

  const baseUrl = (process.env.SKEDYUL_API_URL || '').replace(/\/+$/, '')
  const redirectUri = `${baseUrl}/api/callbacks/oauth/${appHandle}/${appVersionHandle}`
  const oauth = await exchangeSlackCode({
    clientId,
    clientSecret,
    code,
    redirectUri,
  })

  const { token: scopedToken } = await token.exchangeRaw(appInstallationId)
  const currentConfig = getConfig()
  await runWithConfig({ ...currentConfig, apiToken: scopedToken }, async () => {
    const channels = await communicationChannel.list({
      filter: { identifierValue: oauth.teamId },
      limit: 1,
    })
    if (channels.length === 0) {
      await communicationChannel.create('slack', {
        name: oauth.teamName || `Slack ${oauth.teamId}`,
        identifierValue: oauth.teamId,
      })
    }
  })

  return {
    appInstallationId,
    env: {
      SLACK_BOT_TOKEN: oauth.accessToken,
      SLACK_TEAM_ID: oauth.teamId,
      SLACK_TEAM_NAME: oauth.teamName ?? '',
    },
  }
}
