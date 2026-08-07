import type { UninstallHandlerContext, UninstallHandlerResult } from 'skedyul'
import { deleteStoredReaSubscriptions } from '../../lib/ensure-rea-webhooks'
import type { ReaClientEnv } from '../../lib/rea-types'

export default async function uninstall(
  ctx: UninstallHandlerContext,
): Promise<UninstallHandlerResult> {
  const clientEnv: ReaClientEnv = {
    REA_CLIENT_ID: ctx.env.REA_CLIENT_ID || process.env.REA_CLIENT_ID,
    REA_CLIENT_SECRET: ctx.env.REA_CLIENT_SECRET || process.env.REA_CLIENT_SECRET,
    REA_API_BASE_URL: ctx.env.REA_API_BASE_URL || process.env.REA_API_BASE_URL,
    REA_LEAD_SUBSCRIPTION_ID: ctx.env.REA_LEAD_SUBSCRIPTION_ID,
    REA_INTEGRATION_CREATED_SUBSCRIPTION_ID:
      ctx.env.REA_INTEGRATION_CREATED_SUBSCRIPTION_ID,
    REA_INTEGRATION_UPDATED_SUBSCRIPTION_ID:
      ctx.env.REA_INTEGRATION_UPDATED_SUBSCRIPTION_ID,
    REA_INTEGRATION_DELETED_SUBSCRIPTION_ID:
      ctx.env.REA_INTEGRATION_DELETED_SUBSCRIPTION_ID,
  }

  // Legacy v1.0 env
  ;(clientEnv as { REA_SUBSCRIPTION_ID?: string }).REA_SUBSCRIPTION_ID =
    ctx.env.REA_SUBSCRIPTION_ID

  if (!clientEnv.REA_CLIENT_ID || !clientEnv.REA_CLIENT_SECRET) {
    ctx.log.warn(
      `[REA Uninstall] Missing REA credentials for installation ${ctx.appInstallationId}, skipping subscription cleanup`,
    )
    return {}
  }

  try {
    const result = await deleteStoredReaSubscriptions(clientEnv)
    if (result.deleted.length === 0) {
      ctx.log.info(
        `[REA Uninstall] No REA subscription IDs stored for installation ${ctx.appInstallationId}`,
      )
    } else {
      ctx.log.info(
        `[REA Uninstall] Deleted REA subscriptions: ${result.deleted.join(', ')}`,
      )
    }
  } catch (error) {
    ctx.log.error('[REA Uninstall] Failed to delete REA subscriptions:', error)
  }

  return {}
}
