import type { ProvisionHandlerContext, ProvisionHandlerResult } from 'skedyul'
import {
  ensureProvisionReaWebhook,
  ensureReaLeadSubscription,
  prefetchReaSigningKeys,
} from '../../lib/ensure-rea-webhooks'
import type { ReaClientEnv } from '../../lib/rea-types'

export default async function provision(
  ctx: ProvisionHandlerContext,
): Promise<ProvisionHandlerResult> {
  ctx.log.info('[REA Provision] Ensuring enquiry_created webhook registration')

  const registration = await ensureProvisionReaWebhook()
  ctx.log.info(`[REA Provision] Skedyul webhook URL: ${registration.url}`)

  const env = ctx.env as ReaClientEnv

  if (!env.REA_CLIENT_ID || !env.REA_CLIENT_SECRET) {
    ctx.log.warn('[REA Provision] Skipping REA subscription — client credentials not configured')
    return {}
  }

  try {
    const subscription = await ensureReaLeadSubscription(env, registration.url)
    ctx.log.info(
      `[REA Provision] REA lead subscription: ${subscription.subscriptionId} (${subscription.status ?? 'unknown'})`,
    )

    const keyCount = await prefetchReaSigningKeys(env)
    ctx.log.info(`[REA Provision] Prefetched ${keyCount} REA signing key(s)`)
  } catch (error) {
    ctx.log.error('[REA Provision] Failed to configure REA webhook subscription:', error)
    throw error
  }

  return {}
}
