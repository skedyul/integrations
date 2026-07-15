import type { UninstallHandlerContext, UninstallHandlerResult } from 'skedyul'
import { ReaClient } from '../../lib/rea-client'
import type { ReaClientEnv } from '../../lib/rea-types'

export default async function uninstall(
  ctx: UninstallHandlerContext,
): Promise<UninstallHandlerResult> {
  const subscriptionId = ctx.env.REA_SUBSCRIPTION_ID?.trim()

  if (!subscriptionId) {
    ctx.log.info(
      `[REA Uninstall] No REA subscription ID for installation ${ctx.appInstallationId}, skipping REA cleanup`,
    )
    return {}
  }

  const clientEnv: ReaClientEnv = {
    REA_CLIENT_ID: ctx.env.REA_CLIENT_ID || process.env.REA_CLIENT_ID,
    REA_CLIENT_SECRET: ctx.env.REA_CLIENT_SECRET || process.env.REA_CLIENT_SECRET,
    REA_API_BASE_URL: ctx.env.REA_API_BASE_URL || process.env.REA_API_BASE_URL,
  }

  if (!clientEnv.REA_CLIENT_ID || !clientEnv.REA_CLIENT_SECRET) {
    ctx.log.warn(
      `[REA Uninstall] Missing REA credentials for installation ${ctx.appInstallationId}, skipping subscription cleanup`,
    )
    return {}
  }

  try {
    const client = ReaClient.fromEnv(clientEnv)
    await client.deleteWebhookSubscription(subscriptionId)
    ctx.log.info(
      `[REA Uninstall] Deleted REA subscription ${subscriptionId} for installation ${ctx.appInstallationId}`,
    )
  } catch (error) {
    ctx.log.error(
      `[REA Uninstall] Failed to delete REA subscription ${subscriptionId}:`,
      error,
    )
  }

  return {}
}
