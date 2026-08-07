import { instance, setup } from 'skedyul'
import { ReaClient } from './rea-client'
import {
  CONNECT_AGENCIES_SETUP_STEP,
  IGNITE_INTEGRATIONS_URL,
  REA_REQUIRED_LEAD_SCOPE,
  type ReaClientEnv,
} from './rea-types'
import type { ReaIntegrationRecord } from '../events/types'

export interface AgencyRecord {
  id: string
  agency_id: string
  integration_id: string
  scopes: string
  has_lead_scope: boolean
  status: 'ACTIVE' | 'REVOKED'
  connected_at?: string | null
}

export interface ReconcileAgenciesResult {
  enabled: boolean
  agencies: Array<{
    agency_id: string
    integration_id: string
    scopes: string[]
    status: 'ACTIVE' | 'REVOKED'
  }>
  activeCount: number
  message: string
}

interface AgencyListRecord {
  id: string
  agency_id?: string | null
  integration_id?: string | null
  scopes?: string | null
  has_lead_scope?: boolean | null
  status?: string | null
  connected_at?: string | null
}

function scopesToString(scopes: string[] | undefined): string {
  return (scopes ?? []).join(',')
}

function scopesFromString(value: string | null | undefined): string[] {
  if (!value?.trim()) return []
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}

export function integrationHasLeadScope(integration: ReaIntegrationRecord): boolean {
  return Boolean(integration.scopes?.includes(REA_REQUIRED_LEAD_SCOPE))
}

export async function listAgencyRecords(): Promise<AgencyRecord[]> {
  const { data } = await instance.list('agency', { limit: 200 })
  return (data as unknown as AgencyListRecord[]).map((row) => ({
    id: row.id,
    agency_id: (row.agency_id ?? '').toUpperCase(),
    integration_id: row.integration_id ?? '',
    scopes: row.scopes ?? '',
    has_lead_scope: Boolean(row.has_lead_scope),
    status: row.status === 'REVOKED' ? 'REVOKED' : 'ACTIVE',
    connected_at: row.connected_at,
  }))
}

export async function findActiveAgencyByOwnerId(
  ownerId: string,
): Promise<AgencyRecord | null> {
  const agencyId = ownerId.trim().toUpperCase()
  if (!agencyId) return null

  const { data } = await instance.list('agency', {
    filter: {
      agency_id: { eq: agencyId },
      status: { eq: 'ACTIVE' },
      has_lead_scope: { eq: true },
    },
    limit: 1,
  })

  if (data.length === 0) return null

  const row = data[0] as unknown as AgencyListRecord
  return {
    id: row.id,
    agency_id: (row.agency_id ?? agencyId).toUpperCase(),
    integration_id: row.integration_id ?? '',
    scopes: row.scopes ?? '',
    has_lead_scope: Boolean(row.has_lead_scope),
    status: 'ACTIVE',
    connected_at: row.connected_at,
  }
}

export async function upsertAgencyFromIntegration(
  integration: ReaIntegrationRecord,
): Promise<AgencyRecord> {
  const agencyId = integration.ownerId.trim().toUpperCase()
  const hasLead = integrationHasLeadScope(integration)
  const status: 'ACTIVE' | 'REVOKED' = hasLead ? 'ACTIVE' : 'REVOKED'
  const now = new Date().toISOString()
  const scopes = scopesToString(integration.scopes)

  const { data: existing } = await instance.list('agency', {
    filter: { agency_id: { eq: agencyId } },
    limit: 1,
  })

  if (existing.length > 0) {
    const row = existing[0] as unknown as AgencyListRecord
    const updated = await instance.update('agency', row.id, {
      integration_id: integration.integrationId,
      scopes,
      has_lead_scope: hasLead,
      status,
      ...(status === 'ACTIVE' && row.status !== 'ACTIVE'
        ? { connected_at: now }
        : {}),
    })

    return {
      id: updated.id,
      agency_id: agencyId,
      integration_id: integration.integrationId,
      scopes,
      has_lead_scope: hasLead,
      status,
      connected_at: (updated as { connected_at?: string }).connected_at ?? row.connected_at,
    }
  }

  const created = await instance.create('agency', {
    agency_id: agencyId,
    integration_id: integration.integrationId,
    scopes,
    has_lead_scope: hasLead,
    status,
    connected_at: status === 'ACTIVE' ? now : null,
  })

  return {
    id: created.id,
    agency_id: agencyId,
    integration_id: integration.integrationId,
    scopes,
    has_lead_scope: hasLead,
    status,
    connected_at: status === 'ACTIVE' ? now : null,
  }
}

export async function revokeAgencyByOwnerId(
  ownerId: string,
): Promise<AgencyRecord | null> {
  const agencyId = ownerId.trim().toUpperCase()
  if (!agencyId) return null

  const { data } = await instance.list('agency', {
    filter: { agency_id: { eq: agencyId } },
    limit: 1,
  })

  if (data.length === 0) return null

  const row = data[0] as unknown as AgencyListRecord
  const updated = await instance.update('agency', row.id, {
    status: 'REVOKED',
    has_lead_scope: false,
  })

  return {
    id: updated.id,
    agency_id: agencyId,
    integration_id: row.integration_id ?? '',
    scopes: row.scopes ?? '',
    has_lead_scope: false,
    status: 'REVOKED',
    connected_at: row.connected_at,
  }
}

export async function syncConnectAgenciesSetupStep(
  activeCount: number,
): Promise<void> {
  try {
    if (activeCount > 0) {
      await setup.complete(CONNECT_AGENCIES_SETUP_STEP)
    } else if (typeof setup.invalidate === 'function') {
      await setup.invalidate(
        CONNECT_AGENCIES_SETUP_STEP,
        'No agencies with lead:enquiries:read are authorized in Ignite',
      )
    }

    if (typeof setup.reconcile === 'function') {
      await setup.reconcile()
    }
  } catch (error) {
    console.error('[REA] Failed to sync connect_agencies setup step:', error)
  }
}

export async function reconcileAgenciesFromIntegrationsApi(
  env: ReaClientEnv,
): Promise<ReconcileAgenciesResult> {
  const client = ReaClient.fromEnv(env)
  const integrations = await client.listIntegrations()
  const leadIntegrations = integrations.filter(integrationHasLeadScope)
  const leadOwnerIds = new Set(
    leadIntegrations.map((integration) => integration.ownerId.trim().toUpperCase()),
  )

  for (const integration of leadIntegrations) {
    await upsertAgencyFromIntegration(integration)
  }

  // Revoke previously ACTIVE agencies that no longer have lead scope.
  const existing = await listAgencyRecords()
  for (const agency of existing) {
    if (agency.status === 'ACTIVE' && !leadOwnerIds.has(agency.agency_id)) {
      await revokeAgencyByOwnerId(agency.agency_id)
    }
  }

  const after = await listAgencyRecords()
  const active = after.filter((agency) => agency.status === 'ACTIVE' && agency.has_lead_scope)

  await syncConnectAgenciesSetupStep(active.length)

  const enabled = active.length > 0
  const message = enabled
    ? `${active.length} agency${active.length === 1 ? '' : 'ies'} authorized with ${REA_REQUIRED_LEAD_SCOPE}.`
    : `No agency has authorized this partner with ${REA_REQUIRED_LEAD_SCOPE} in Ignite yet. Ask the agency to enable the integration: ${IGNITE_INTEGRATIONS_URL}`

  return {
    enabled,
    agencies: after.map((agency) => ({
      agency_id: agency.agency_id,
      integration_id: agency.integration_id,
      scopes: scopesFromString(agency.scopes),
      status: agency.status,
    })),
    activeCount: active.length,
    message,
  }
}
