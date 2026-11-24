import type { UninstallHandlerContext, UninstallHandlerResult } from 'skedyul'
import { cleanupGoogleCrmRows } from '../../lib/cleanup-google-crm'
import { listCrmCalendarRecords } from '../../lib/crm-calendars'
import {
  getOAuthClientWithInlineRefresh,
  revokeGoogleRefreshToken,
} from '../../lib/google_client'
import type { GoogleInstallEnv } from '../../lib/google_install_env'
import { removeSyncSchedules } from '../../lib/sync-schedules'
import { stopCalendarWatch } from '../../services/calendar/watch'

type UninstallLog = UninstallHandlerContext['log']

/** Stop every stored push channel while the refresh token still works. */
async function stopCalendarWatches(env: GoogleInstallEnv, log: UninstallLog): Promise<number> {
  let records
  try {
    records = await listCrmCalendarRecords()
  } catch (error) {
    log.warn('[Google Uninstall] Could not list calendars to stop push channels:', error)
    return 0
  }
  const watched = records.filter(
    (record) => record.watch_channel_id && record.watch_resource_id,
  )
  if (watched.length === 0) {
    return 0
  }

  let client
  try {
    client = await getOAuthClientWithInlineRefresh(env)
  } catch (error) {
    log.warn('[Google Uninstall] Could not authorize to stop push channels:', error)
    return 0
  }
  if (!client) {
    return 0
  }

  for (const record of watched) {
    await stopCalendarWatch(client, {
      channelId: record.watch_channel_id as string,
      resourceId: record.watch_resource_id as string,
    })
  }
  return watched.length
}

export default async function uninstall(
  ctx: UninstallHandlerContext,
): Promise<UninstallHandlerResult> {
  ctx.log.info('[Google Uninstall] Starting uninstall cleanup')

  const env = ctx.env as GoogleInstallEnv

  const stopped = await stopCalendarWatches(env, ctx.log)
  ctx.log.info(`[Google Uninstall] Stopped ${stopped} push channel(s)`)

  try {
    const removed = await removeSyncSchedules()
    ctx.log.info(`[Google Uninstall] Removed ${removed} sync schedule(s)`)
  } catch (error) {
    ctx.log.warn('[Google Uninstall] Could not remove sync schedules:', error)
  }

  if (env.GOOGLE_REFRESH_TOKEN) {
    await revokeGoogleRefreshToken(env)
  }

  await cleanupGoogleCrmRows(ctx.log)

  ctx.log.info('[Google Uninstall] Completed uninstall cleanup')
  return {}
}
