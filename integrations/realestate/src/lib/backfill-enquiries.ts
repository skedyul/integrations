import { instance } from 'skedyul'
import { ReaClient } from './rea-client'
import { buildEnquiryCreatedPayload } from './rea-enquiry'
import { createReaEvent } from './create-rea-event'
import { findActiveAgencyByOwnerId } from './reconcile-agencies'
import {
  normalizeReaApiBaseUrl,
  REA_AGENCY_ID_PATTERN,
  REA_LEAD_EVENT_CATEGORY,
  REA_LEAD_EVENT_TYPE,
  type ReaClientEnv,
} from './rea-types'
import type { ReaEnquiryRecord, ReaIntegrationRecord } from '../events/types'
import { parseReaEventPayload } from '../events/schemas'

export const BACKFILL_DEFAULT_LIMIT = 200
export const BACKFILL_MAX_LIMIT = 1000
export const BACKFILL_MAX_REPORTED_ITEMS = 50
export const BACKFILL_MAX_REPORTED_ERRORS = 5

export type BackfillEnquiryAction =
  | 'emit'
  | 'skip_existing'
  | 'skip_agency'
  | 'skip_window'

export interface BackfillEnquiryItem {
  id: string
  agency_id: string
  received_at?: string
  action: BackfillEnquiryAction
  skip_reason?: string
}

export interface BackfillEnquiriesInput {
  since: string
  until?: string
  agency_id?: string
  dry_run?: boolean
  limit?: number
}

export interface BackfillEnquiriesResult {
  status: 'dry_run' | 'success' | 'partial'
  dry_run: boolean
  window_start: string
  window_end: string
  agencies_scanned: string[]
  found: number
  skipped_existing: number
  skipped_agency: number
  skipped_window: number
  emitted: number
  failed: number
  items: BackfillEnquiryItem[]
  errors?: string[]
  message: string
}

export function parseBackfillTimestamp(
  value: string,
  field: 'since' | 'until',
): Date {
  const trimmed = value.trim()
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
  const iso = dateOnly
    ? field === 'until'
      ? `${trimmed}T23:59:59.999Z`
      : `${trimmed}T00:00:00.000Z`
    : trimmed
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid ISO timestamp for ${field}: ${value}`)
  }
  return parsed
}

function parseLimit(value: number | undefined): number {
  if (value == null || !Number.isFinite(value) || value <= 0) {
    return BACKFILL_DEFAULT_LIMIT
  }
  return Math.min(Math.floor(value), BACKFILL_MAX_LIMIT)
}

function normalizeAgencyId(value: string | undefined): string | undefined {
  const trimmed = value?.trim().toUpperCase()
  if (!trimmed) return undefined
  if (!REA_AGENCY_ID_PATTERN.test(trimmed)) {
    throw new Error(`agency_id must be a 6-letter REA agency id, got ${value}`)
  }
  return trimmed
}

function enquiryReceivedAt(enquiry: ReaEnquiryRecord): Date | null {
  if (!enquiry.receivedAt) return null
  const parsed = new Date(enquiry.receivedAt)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function inWindow(
  enquiry: ReaEnquiryRecord,
  windowStart: Date,
  windowEnd: Date,
): boolean {
  const receivedAt = enquiryReceivedAt(enquiry)
  if (!receivedAt) return true
  return receivedAt >= windowStart && receivedAt <= windowEnd
}

async function crmHasEnquiry(enquiryId: string): Promise<boolean> {
  try {
    const { data } = await instance.list('enquiry', {
      filter: { rea_enquiry_id: { eq: enquiryId } },
      limit: 1,
    })
    return data.length > 0
  } catch (error) {
    console.warn(
      `[REA] backfill could not list CRM enquiry ${enquiryId}:`,
      error,
    )
    return false
  }
}

function leadIntegrationForAgency(
  integrations: ReaIntegrationRecord[],
  agencyId: string,
): ReaIntegrationRecord | undefined {
  return integrations.find(
    (integration) => integration.ownerId.trim().toUpperCase() === agencyId,
  )
}

export async function backfillReaEnquiries(
  env: ReaClientEnv,
  input: BackfillEnquiriesInput,
): Promise<BackfillEnquiriesResult> {
  const windowStart = parseBackfillTimestamp(input.since, 'since')
  const windowEnd = input.until
    ? parseBackfillTimestamp(input.until, 'until')
    : new Date()

  if (windowEnd <= windowStart) {
    throw new Error('until must be after since')
  }

  const agencyId = normalizeAgencyId(input.agency_id)
  const dryRun = input.dry_run ?? true
  const limit = parseLimit(input.limit)

  const client = ReaClient.fromEnv(env)
  const leadIntegrations = await client.listLeadIntegrations()
  const authorizedIds = [
    ...new Set(
      leadIntegrations
        .map((integration) => integration.ownerId.trim().toUpperCase())
        .filter(Boolean),
    ),
  ]

  const agenciesScanned = agencyId ? [agencyId] : authorizedIds
  if (agenciesScanned.length === 0) {
    throw new Error(
      'No lead-capable agencies are authorized in Ignite. Check Ignite status first.',
    )
  }

  let listed = agencyId
    ? await client.listEnquiries({
        since: windowStart.toISOString(),
        agencyId,
      })
    : await client.listEnquiries({ since: windowStart.toISOString() })

  if (listed.length === 0 && agencyId) {
    listed = (await client.listEnquiries({ since: windowStart.toISOString() })).filter(
      (enquiry) => enquiry.agencyId.trim().toUpperCase() === agencyId,
    )
  }

  const allowed = new Set(agenciesScanned)
  const inScope = listed.filter((enquiry) =>
    allowed.has(enquiry.agencyId.trim().toUpperCase()),
  )

  const ordered = [...inScope].sort((left, right) => {
    const leftAt = left.receivedAt ?? ''
    const rightAt = right.receivedAt ?? ''
    return leftAt.localeCompare(rightAt)
  })

  const items: BackfillEnquiryItem[] = []
  let skippedExisting = 0
  let skippedAgency = 0
  let skippedWindow = 0
  let emitted = 0
  let failed = 0
  const errors: string[] = []
  const subscriptionId = env.REA_LEAD_SUBSCRIPTION_ID?.trim() || 'backfill'

  for (const enquiry of ordered) {
    if (items.filter((item) => item.action === 'emit').length >= limit) {
      break
    }

    const agencyKey = enquiry.agencyId.trim().toUpperCase()
    const baseItem: Omit<BackfillEnquiryItem, 'action'> = {
      id: enquiry.id,
      agency_id: agencyKey,
      received_at: enquiry.receivedAt,
    }

    if (!inWindow(enquiry, windowStart, windowEnd)) {
      skippedWindow += 1
      items.push({
        ...baseItem,
        action: 'skip_window',
        skip_reason: 'received_at outside until',
      })
      continue
    }

    if (await crmHasEnquiry(enquiry.id)) {
      skippedExisting += 1
      items.push({
        ...baseItem,
        action: 'skip_existing',
        skip_reason: 'CRM already has rea_enquiry_id',
      })
      continue
    }

    const agency = await findActiveAgencyByOwnerId(agencyKey)
    const ignite = leadIntegrationForAgency(leadIntegrations, agencyKey)
    const integrationId = agency?.integration_id || ignite?.integrationId || ''

    if (!agency || !integrationId) {
      skippedAgency += 1
      items.push({
        ...baseItem,
        action: 'skip_agency',
        skip_reason: ignite
          ? 'Authorized in Ignite but no ACTIVE CRM agency (deploy the Core INTERNAL instance.list fix, then re-run)'
          : 'No ACTIVE lead-capable agency in CRM or Ignite',
      })
      continue
    }

    items.push({ ...baseItem, action: 'emit' })

    if (dryRun) continue

    try {
      const payload = parseReaEventPayload(
        'enquiry.created',
        buildEnquiryCreatedPayload({
          webhookEvent: {
            resourceUrl: `${normalizeReaApiBaseUrl(env.REA_API_BASE_URL)}/lead/v1/enquiries/${enquiry.id}`,
            resourceId: enquiry.id,
            eventTime: enquiry.receivedAt ?? windowEnd.toISOString(),
            eventId: `backfill:${enquiry.id}`,
            eventType: REA_LEAD_EVENT_TYPE,
            eventCategory: REA_LEAD_EVENT_CATEGORY,
            ownerId: agencyKey,
            ownerType: 'agency',
            subscriptionId,
          },
          agency: {
            agency_id: agency.agency_id || agencyKey,
            integration_id: integrationId,
          },
          enquiry,
        }),
      )

      await createReaEvent('enquiry.created', payload, {
        correlationId: `backfill:${enquiry.id}`,
        trigger: 'backfill',
      })
      emitted += 1
    } catch (error) {
      failed += 1
      const message = error instanceof Error ? error.message : String(error)
      if (errors.length < BACKFILL_MAX_REPORTED_ERRORS) {
        errors.push(`${enquiry.id}: ${message}`)
      }
      console.error(`[REA] backfill failed for ${enquiry.id}:`, error)
    }
  }

  const wouldEmit = items.filter((item) => item.action === 'emit').length
  const status = dryRun ? 'dry_run' : failed > 0 ? 'partial' : 'success'
  const message = dryRun
    ? `Dry run: ${inScope.length} REA enquiry(ies) in window, ${wouldEmit} would emit, ${skippedExisting} already in CRM, ${skippedAgency} skipped (agency), ${skippedWindow} outside until.`
    : `Backfill ${status}: emitted ${emitted}, failed ${failed}, skipped existing ${skippedExisting}, skipped agency ${skippedAgency}.`

  return {
    status,
    dry_run: dryRun,
    window_start: windowStart.toISOString(),
    window_end: windowEnd.toISOString(),
    agencies_scanned: agenciesScanned,
    found: inScope.length,
    skipped_existing: skippedExisting,
    skipped_agency: skippedAgency,
    skipped_window: skippedWindow,
    emitted: dryRun ? 0 : emitted,
    failed,
    items: items.slice(0, BACKFILL_MAX_REPORTED_ITEMS),
    ...(errors.length > 0 ? { errors } : {}),
    message,
  }
}
