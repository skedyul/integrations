import {
  AuthenticationError,
  type InstallHandlerContext,
  type InstallHandlerResult,
} from 'skedyul'
import {
  ensureInstallReaWebhook,
  ensureReaAgencyLeadSubscription,
} from '../../lib/ensure-rea-webhooks'
import { ReaClient } from '../../lib/rea-client'
import {
  REA_AGENCY_ID_PATTERN,
  REA_REQUIRED_LEAD_SCOPE,
  type ReaClientEnv,
} from '../../lib/rea-types'
import type { ReaIntegrationRecord } from '../../events/types'

const IGNITE_INTEGRATIONS_URL =
  'https://ignite.realestate.com.au/manage/data-and-integrations'

function resolveAgencyIntegration(
  integrations: ReaIntegrationRecord[],
  agencyId?: string,
): ReaIntegrationRecord {
  if (agencyId) {
    const match = integrations.find((integration) => integration.ownerId === agencyId)
    if (!match) {
      throw new AuthenticationError(
        `No authorized REA integration found for agency ${agencyId}. The agency must authorize your partner account with ${REA_REQUIRED_LEAD_SCOPE} scope in Ignite before installing. ${IGNITE_INTEGRATIONS_URL}`,
      )
    }
    return match
  }

  if (integrations.length === 0) {
    throw new AuthenticationError(
      `No agencies have authorized your partner account for ${REA_REQUIRED_LEAD_SCOPE}. Ask the agency to authorize you in Ignite first: ${IGNITE_INTEGRATIONS_URL}`,
    )
  }

  if (integrations.length === 1) {
    return integrations[0]!
  }

  const agencyIds = integrations.map((integration) => integration.ownerId).join(', ')
  throw new AuthenticationError(
    `Multiple agencies are authorized (${agencyIds}). Enter your 6-letter REA Agency ID to select which agency to connect.`,
  )
}

export default async function install(
  ctx: InstallHandlerContext,
): Promise<InstallHandlerResult> {
  const rawAgencyId = ctx.env.REA_AGENCY_ID?.trim().toUpperCase()
  const agencyId = rawAgencyId || undefined

  if (agencyId && !REA_AGENCY_ID_PATTERN.test(agencyId)) {
    throw new AuthenticationError(
      'REA Agency ID must be exactly 6 uppercase letters (e.g. ABCDEF).',
    )
  }

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

  const client = ReaClient.fromEnv(clientEnv)
  const leadIntegrations = await client.listLeadIntegrations()
  const integration = resolveAgencyIntegration(leadIntegrations, agencyId)
  const resolvedAgencyId = integration.ownerId

  ctx.log.info(
    `[REA Install] Connecting agency ${resolvedAgencyId} for workplace ${ctx.workplace.subdomain}`,
  )

  const registration = await ensureInstallReaWebhook()
  ctx.log.info(`[REA Install] Skedyul webhook URL: ${registration.url}`)

  const subscription = await ensureReaAgencyLeadSubscription(
    clientEnv,
    resolvedAgencyId,
    registration.url,
  )
  ctx.log.info(
    `[REA Install] REA lead subscription: ${subscription.subscriptionId} (${subscription.status ?? 'unknown'})`,
  )

  ctx.log.info('[REA Install] Installation completed successfully')

  return {
    env: {
      REA_AGENCY_ID: resolvedAgencyId,
      REA_INTEGRATION_ID: integration.integrationId,
      REA_SUBSCRIPTION_ID: subscription.subscriptionId,
    },
  }
}
