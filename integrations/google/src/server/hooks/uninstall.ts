import type { UninstallHandlerContext, UninstallHandlerResult } from 'skedyul'
import { instance } from 'skedyul'
import {
  getAuthenticatedOAuthClient,
  revokeGoogleRefreshToken,
} from '../../lib/google_client'
import type { GoogleCalendarRecord } from '../../events/types'
import type { GoogleInstallEnv } from '../../lib/google_install_env'
import { stopCalendarWatch } from '../../services/calendar/watch'

export default async function uninstall(
  ctx: UninstallHandlerContext,
): Promise<UninstallHandlerResult> {
  ctx.log.info('[Google Uninstall] Starting uninstall cleanup')

  const env = ctx.env as GoogleInstallEnv
  const calendars = await instance.list('google_calendar', { limit: 250 })

  try {
    const { client } = await getAuthenticatedOAuthClient(env)

    for (const record of calendars.data as GoogleCalendarRecord[]) {
      if (record.watch_channel_id && record.watch_resource_id) {
        await stopCalendarWatch(client, {
          channelId: record.watch_channel_id,
          resourceId: record.watch_resource_id,
        })
      }

      await instance.update('google_calendar', record.id, {
        sync_enabled: false,
        watch_channel_id: null,
        watch_resource_id: null,
        watch_expiration: null,
        watch_token: null,
      })
    }
  } catch (error) {
    ctx.log.warn('[Google Uninstall] Failed to stop calendar watches:', error)
  }

  if (env.GOOGLE_REFRESH_TOKEN) {
    await revokeGoogleRefreshToken(env.GOOGLE_REFRESH_TOKEN)
  }

  ctx.log.info('[Google Uninstall] Completed uninstall cleanup')
  return {}
}
