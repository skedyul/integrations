import type { ProvisionHandlerContext, ProvisionHandlerResult } from 'skedyul'
import {
  prefetchReaSigningKeys,
  removeAllAgenciesReaLeadSubscription,
} from '../../lib/ensure-rea-webhooks'
import type { ReaClientEnv } from '../../lib/rea-types'

export default async function provision(
  ctx: ProvisionHandlerContext,
): Promise<ProvisionHandlerResult> {
  ctx.log.info('[REA Provision] Running provision hook')

  const env = ctx.env as ReaClientEnv

  if (!env.REA_CLIENT_ID || !env.REA_CLIENT_SECRET) {
    ctx.log.warn('[REA Provision] Skipping REA setup — client credentials not configured')
    return {}
  }

  try {
    const cleanup = await removeAllAgenciesReaLeadSubscription(env)
    if (cleanup.deleted) {
      ctx.log.info(
        `[REA Provision] Removed legacy all-agencies REA subscription: ${cleanup.subscriptionId}`,
      )
    } else {
      ctx.log.info('[REA Provision] No legacy all-agencies REA subscription found')
    }

    const keyCount = await prefetchReaSigningKeys(env)
    ctx.log.info(`[REA Provision] Prefetched ${keyCount} REA signing key(s)`)
  } catch (error) {
    ctx.log.error('[REA Provision] Failed during provision setup:', error)
    throw error
  }

  return {}
}
