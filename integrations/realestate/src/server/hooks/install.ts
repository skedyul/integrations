import {
  AuthenticationError,
  instance,
  MissingRequiredFieldError,
  type InstallHandlerContext,
  type InstallHandlerResult,
} from 'skedyul'
import { ReaClient } from '../../lib/rea-client'
import {
  REA_AGENCY_ID_PATTERN,
  REA_REQUIRED_LEAD_SCOPE,
  type ReaClientEnv,
} from '../../lib/rea-types'

export default async function install(
  ctx: InstallHandlerContext,
): Promise<InstallHandlerResult> {
  const agencyId = ctx.env.REA_AGENCY_ID?.trim().toUpperCase()

  if (!agencyId) {
    throw new MissingRequiredFieldError('REA_AGENCY_ID')
  }

  if (!REA_AGENCY_ID_PATTERN.test(agencyId)) {
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

  ctx.log.info(`[REA Install] Validating agency ${agencyId} for workplace ${ctx.workplace.subdomain}`)

  const client = ReaClient.fromEnv(clientEnv)
  const integration = await client.findIntegrationForAgency(agencyId)

  if (!integration) {
    throw new AuthenticationError(
      `No authorized REA integration found for agency ${agencyId}. The agency must authorize your partner account with ${REA_REQUIRED_LEAD_SCOPE} scope before installing.`,
    )
  }

  const existingAgencies = await instance.list('agency', {
    filter: { agency_id: agencyId },
    limit: 1,
  })

  if (existingAgencies.data.length > 0) {
    const existing = existingAgencies.data[0] as { id: string }
    await instance.update('agency', existing.id, {
      integration_id: integration.integrationId,
      status: 'ACTIVE',
    })
    ctx.log.info(`[REA Install] Updated existing agency record: ${existing.id}`)
  } else {
    const created = await instance.create('agency', {
      agency_id: agencyId,
      integration_id: integration.integrationId,
      status: 'ACTIVE',
    })
    ctx.log.info(`[REA Install] Created agency record: ${(created as { id: string }).id}`)
  }

  ctx.log.info('[REA Install] Installation completed successfully')

  return {
    env: {
      REA_AGENCY_ID: agencyId,
    },
  }
}
