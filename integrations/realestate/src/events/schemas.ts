/**
 * Zod payload schemas for REA app events.
 */

import { z } from 'skedyul'
import type { ReaEventName } from './types'

const nullableString = z.string().nullable()

export const ReaWebhookContextSchema = z
  .object({
    event_type: z.string().min(1),
    event_id: z.string().min(1),
    event_time: z.string(),
    owner_id: z.string().min(1),
    subscription_id: z.string().min(1),
  })
  .strict()

export const ReaAgencyContextSchema = z
  .object({
    agency_id: z.string().min(1),
    integration_id: z.string().min(1),
  })
  .strict()

export const ReaEnquiryEntitySchema = z
  .object({
    rea_enquiry_id: z.string().min(1),
    rea_agency_id: z.string().min(1),
    enquiry_type: nullableString,
    comments: nullableString,
    first_name: nullableString,
    last_name: nullableString,
    email: nullableString,
    phone: nullableString,
    postcode: nullableString,
    preferred_contact_method: nullableString,
    received_at: nullableString,
    processed_at: nullableString,
    listing_id: nullableString,
    listing_address: nullableString,
    source: nullableString,
  })
  .strict()

export const ReaEnquiryEventPayloadSchema = z
  .object({
    webhook: ReaWebhookContextSchema,
    agency: ReaAgencyContextSchema,
    enquiry: ReaEnquiryEntitySchema,
  })
  .strict()

export const REA_EVENT_PAYLOAD_SCHEMAS = {
  'enquiry.created': ReaEnquiryEventPayloadSchema,
} as const satisfies Record<ReaEventName, z.ZodType>

export type ReaEventPayloadInferred<T extends ReaEventName = ReaEventName> =
  z.infer<(typeof REA_EVENT_PAYLOAD_SCHEMAS)[T]>

export function parseReaEventPayload<T extends ReaEventName>(
  eventName: T,
  payload: unknown,
): ReaEventPayloadInferred<T> {
  return REA_EVENT_PAYLOAD_SCHEMAS[eventName].parse(
    payload,
  ) as ReaEventPayloadInferred<T>
}

export function isReaEventName(value: string): value is ReaEventName {
  return value in REA_EVENT_PAYLOAD_SCHEMAS
}
