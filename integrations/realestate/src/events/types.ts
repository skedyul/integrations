/**
 * Typed REA app event payloads.
 *
 * Nested envelope: { webhook, agency, enquiry }.
 */

export interface ReaWebhookContext {
  event_type: string
  event_id: string
  event_time: string
  owner_id: string
  subscription_id: string
}

export interface ReaAgencyContext {
  agency_id: string
  integration_id: string
}

export interface ReaEnquiryEntity {
  rea_enquiry_id: string
  rea_agency_id: string
  enquiry_type: string | null
  comments: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  postcode: string | null
  preferred_contact_method: string | null
  received_at: string | null
  processed_at: string | null
  listing_id: string | null
  listing_address: string | null
  source: string | null
}

export interface ReaEnquiryEventPayload {
  webhook: ReaWebhookContext
  agency: ReaAgencyContext
  enquiry: ReaEnquiryEntity
}

export interface ReaEventCatalogPayloadMap {
  'enquiry.created': ReaEnquiryEventPayload
}

export type ReaEventName = keyof ReaEventCatalogPayloadMap

export type ReaEventCatalogPayload<T extends ReaEventName = ReaEventName> =
  ReaEventCatalogPayloadMap[T]

export type ReaEventEmitPayload<T extends ReaEventName = ReaEventName> =
  ReaEventCatalogPayloadMap[T]

export type ReaEventEmitPayloadMap = ReaEventCatalogPayloadMap

export interface NormalizedReaWebhookEvent {
  resourceUrl: string
  resourceId: string
  eventTime: string
  eventId: string
  eventType: string
  eventCategory: string
  ownerId: string
  ownerType: string
  subscriptionId: string
}

export interface ReaIntegrationRecord {
  integrationId: string
  ownerId: string
  ownerType: string
  scopes: string[]
  updatedAt?: string
}

export interface ReaEnquiryRecord {
  id: string
  agencyId: string
  receivedAt?: string
  processedAt?: string
  type?: string
  comments?: string
  contactDetails?: {
    fullName?: string
    email?: string
    phone?: string
    postcode?: string
    preferredContactMethod?: string
  }
  listing?: {
    id?: string
    address?: string
  }
  source?: {
    id?: string | null
    name?: string | null
    type?: string | null
  }
}
