import type {
  NormalizedReaWebhookEvent,
  ReaEnquiryRecord,
  ReaEnquiryEntity,
  ReaEnquiryEventPayload,
} from '../events/types'
import type { ActiveAgencyRecord } from './resolve-agency-for-owner'

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function splitFullName(fullName: string | undefined): {
  first_name: string | null
  last_name: string | null
} {
  const trimmed = fullName?.trim()
  if (!trimmed) {
    return { first_name: null, last_name: null }
  }

  const spaceIndex = trimmed.indexOf(' ')
  if (spaceIndex === -1) {
    return { first_name: trimmed, last_name: null }
  }

  return {
    first_name: trimmed.slice(0, spaceIndex),
    last_name: trimmed.slice(spaceIndex + 1).trim() || null,
  }
}

export function normalizeReaWebhookEvents(
  body: Record<string, unknown>,
): NormalizedReaWebhookEvent[] {
  const events = body.events
  if (!Array.isArray(events)) {
    return []
  }

  const normalized: NormalizedReaWebhookEvent[] = []

  for (const item of events) {
    if (item == null || typeof item !== 'object' || Array.isArray(item)) {
      continue
    }

    const record = item as Record<string, unknown>
    const resourceUrl = readString(record.resourceUrl)
    const resourceId = readString(record.resourceId)
    const eventId = readString(record.eventId)
    const eventType = readString(record.eventType)
    const eventCategory = readString(record.eventCategory)
    const ownerId = readString(record.ownerId)
    const ownerType = readString(record.ownerType)
    const subscriptionId = readString(record.subscriptionId)
    const eventTime = readString(record.eventTime)

    if (
      !resourceUrl ||
      !resourceId ||
      !eventId ||
      !eventType ||
      !eventCategory ||
      !ownerId ||
      !ownerType ||
      !subscriptionId ||
      !eventTime
    ) {
      continue
    }

    normalized.push({
      resourceUrl,
      resourceId,
      eventTime,
      eventId,
      eventType,
      eventCategory,
      ownerId,
      ownerType,
      subscriptionId,
    })
  }

  return normalized
}

export function transformReaEnquiryRecord(
  enquiry: ReaEnquiryRecord,
): ReaEnquiryEntity {
  const { first_name, last_name } = splitFullName(enquiry.contactDetails?.fullName)

  const sourceParts = [
    enquiry.source?.type,
    enquiry.source?.name,
  ].filter((part) => typeof part === 'string' && part.trim())

  return {
    rea_enquiry_id: enquiry.id,
    rea_agency_id: enquiry.agencyId,
    enquiry_type: enquiry.type ?? null,
    comments: enquiry.comments ?? null,
    first_name,
    last_name,
    email: enquiry.contactDetails?.email ?? null,
    phone: enquiry.contactDetails?.phone ?? null,
    postcode: enquiry.contactDetails?.postcode ?? null,
    preferred_contact_method: enquiry.contactDetails?.preferredContactMethod ?? null,
    received_at: enquiry.receivedAt ?? null,
    processed_at: enquiry.processedAt ?? null,
    listing_id: enquiry.listing?.id ?? null,
    listing_address: enquiry.listing?.address ?? null,
    source: sourceParts.length > 0 ? sourceParts.join(' / ') : null,
  }
}

export function buildEnquiryCreatedPayload(params: {
  webhookEvent: NormalizedReaWebhookEvent
  agency: ActiveAgencyRecord
  enquiry: ReaEnquiryRecord
}): ReaEnquiryEventPayload {
  return {
    webhook: {
      event_type: params.webhookEvent.eventType,
      event_id: params.webhookEvent.eventId,
      event_time: params.webhookEvent.eventTime,
      owner_id: params.webhookEvent.ownerId,
      subscription_id: params.webhookEvent.subscriptionId,
    },
    agency: {
      id: params.agency.id,
      agency_id: params.agency.agency_id,
      integration_id: params.agency.integration_id,
    },
    enquiry: transformReaEnquiryRecord(params.enquiry),
  }
}
