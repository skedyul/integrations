import {
  AuthenticationError,
  type InstallHandlerContext,
  type InstallHandlerResult,
} from 'skedyul'
import { ensureInstallReaSubscriptions } from '../../lib/ensure-rea-webhooks'
import { reconcileAgenciesFromIntegrationsApi } from '../../lib/reconcile-agencies'
import type { ReaClientEnv } from '../../lib/rea-types'

export default async function install(
  ctx: InstallHandlerContext,
): Promise<InstallHandlerResult> {
  const clientEnv: ReaClientEnv = {
    REA_CLIENT_ID: ctx.env.REA_CLIENT_ID || process.env.REA_CLIENT_ID,
    REA_CLIENT_SECRET: ctx.env.REA_CLIENT_SECRET || process.env.REA_CLIENT_SECRET,
    REA_API_BASE_URL: ctx.env.REA_API_BASE_URL || process.env.REA_API_BASE_URL,
  }

  if (!clientEnv.REA_CLIENT_ID || !clientEnv.REA_CLIENT_SECRET) {
    throw new AuthenticationError(
      'REA partner credentials are not configured on this app version. Contact your administrator.',
    )
  }

  ctx.log.info(
    `[REA Install] Ensuring all-owners REA subscriptions for workplace ${ctx.workplace.subdomain}`,
  )

  const subscriptions = await ensureInstallReaSubscriptions(clientEnv)

  ctx.log.info(
    `[REA Install] Enquiry webhook: ${subscriptions.enquiryWebhookUrl} (sub ${subscriptions.leadSubscriptionId})`,
  )
  ctx.log.info(
    `[REA Install] Integration webhook: ${subscriptions.integrationWebhookUrl}`,
  )

  try {
    const reconcile = await reconcileAgenciesFromIntegrationsApi(clientEnv)
    ctx.log.info(
      `[REA Install] Seeded agencies: active=${reconcile.activeCount} — ${reconcile.message}`,
    )
  } catch (error) {
    // Subscriptions are the critical path; agency seed can be retried via check_ignite_integration.
    ctx.log.warn('[REA Install] Agency seed from Integrations API failed:', error)
  }

  ctx.log.info('[REA Install] Installation completed successfully')

  return {
    env: {
      REA_LEAD_SUBSCRIPTION_ID: subscriptions.leadSubscriptionId,
      REA_INTEGRATION_CREATED_SUBSCRIPTION_ID:
        subscriptions.integrationCreatedSubscriptionId,
      REA_INTEGRATION_UPDATED_SUBSCRIPTION_ID:
        subscriptions.integrationUpdatedSubscriptionId,
      REA_INTEGRATION_DELETED_SUBSCRIPTION_ID:
        subscriptions.integrationDeletedSubscriptionId,
    },
  }
}
