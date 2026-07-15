import { instance } from 'skedyul'

export interface ActiveAgencyRecord {
  id: string
  agency_id: string
  integration_id: string
  appInstallationId: string
}

interface AgencyListRecord {
  id: string
  agency_id?: string | null
  integration_id?: string | null
  status?: string
  appInstallationId?: string | null
}

/**
 * Find an ACTIVE agency for a REA ownerId at provision scope (sk_prv_ token).
 */
export async function resolveActiveAgencyForOwnerId(
  ownerId: string,
): Promise<ActiveAgencyRecord | null> {
  if (!ownerId.trim()) {
    return null
  }

  const { data } = await instance.list('agency', {
    filter: {
      agency_id: { eq: ownerId },
      status: { eq: 'ACTIVE' },
    },
    limit: 1,
  })

  if (data.length === 0) {
    return null
  }

  const agency = data[0] as unknown as AgencyListRecord

  if (!agency.appInstallationId || !agency.agency_id || !agency.integration_id) {
    console.warn(
      `[REA] Active agency ${agency.id} missing appInstallationId, agency_id, or integration_id`,
    )
    return null
  }

  return {
    id: agency.id,
    agency_id: agency.agency_id,
    integration_id: agency.integration_id,
    appInstallationId: agency.appInstallationId,
  }
}
