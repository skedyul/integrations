import { instance, token, runWithConfig, getConfig } from 'skedyul'
import type { OAuthCallbackContext, OAuthCallbackResult } from 'skedyul'
import {
  createOAuth2Client,
  exchangeCodeForTokens,
  fetchGoogleAccountEmail,
  requireGoogleOAuthConfig,
  tokenSetToInstallEnv,
} from '../../lib/google_client'
import { buildOAuthRedirectUri } from '../../lib/google_install_env'
import { listGoogleCalendars } from '../../services/calendar/client'
import { ensureInstallCalendarPushWebhook } from '../../lib/calendar_link'

export default async function oauthCallback(
  ctx: OAuthCallbackContext,
): Promise<OAuthCallbackResult> {
  const { request } = ctx
  const query = request.query

  if (query.error) {
    const errorDescription = query.error_description || query.error
    throw new Error(`OAuth error: ${errorDescription}`)
  }

  const code = query.code
  if (!code) {
    throw new Error('Missing authorization code in OAuth callback')
  }

  let appInstallationId: string | undefined
  let appHandle: string | undefined
  let appVersionHandle: string | undefined

  if (query.state) {
    try {
      const stateData = JSON.parse(
        Buffer.from(query.state, 'base64').toString('utf-8'),
      ) as {
        appInstallationId?: string
        app?: { handle?: string; versionHandle?: string }
      }
      appInstallationId = stateData.appInstallationId
      appHandle = stateData.app?.handle
      appVersionHandle = stateData.app?.versionHandle
    } catch {
      throw new Error('Invalid state parameter: failed to decode')
    }
  }

  if (!appInstallationId) {
    throw new Error('Missing appInstallationId in state parameter')
  }

  if (!appHandle || !appVersionHandle) {
    throw new Error('Missing app handle or version handle in state parameter')
  }

  const oauthConfig = requireGoogleOAuthConfig({
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  })

  const redirectUri = buildOAuthRedirectUri(
    { SKEDYUL_API_URL: process.env.SKEDYUL_API_URL },
    appHandle,
    appVersionHandle,
  )

  ctx.log.info(`[Google OAuth] Processing callback for installation ${appInstallationId}`)

  const { token: scopedToken } = await token.exchange(appInstallationId)
  const currentConfig = getConfig()

  try {
    const tokens = await exchangeCodeForTokens(
      {
        ...oauthConfig,
        redirectUri,
      },
      code,
    )
    const email = await fetchGoogleAccountEmail(tokens.accessToken)

    const authClient = createOAuth2Client({
      ...oauthConfig,
      redirectUri,
    })
    authClient.setCredentials({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expiry_date: tokens.expiryDate ?? undefined,
    })

    await runWithConfig({ ...currentConfig, apiToken: scopedToken }, async () => {
      await ensureInstallCalendarPushWebhook()

      const calendars = await listGoogleCalendars(authClient)

      for (const calendar of calendars) {
        const existing = await instance.list('google_calendar', {
          filter: { calendar_id: calendar.calendar_id },
          limit: 1,
        })

        const payload = {
          calendar_id: calendar.calendar_id,
          summary: calendar.summary,
          primary: calendar.primary,
          sync_enabled: calendar.primary,
          sync_direction: 'both',
          external_read_only: false,
        }

        if (existing.data.length > 0) {
          const record = existing.data[0] as { id: string }
          await instance.update('google_calendar', record.id, payload)
        } else {
          await instance.create('google_calendar', payload)
        }
      }

      ctx.log.info(`[Google OAuth] Seeded ${calendars.length} calendar records`)
    })

    return {
      appInstallationId,
      env: tokenSetToInstallEnv(tokens, email),
    }
  } catch (error) {
    ctx.log.error('[Google OAuth] OAuth callback failed:', error)
    const message = error instanceof Error ? error.message : String(error ?? 'Unknown error')
    throw new Error(`Failed to complete Google OAuth: ${message}`)
  }
}
