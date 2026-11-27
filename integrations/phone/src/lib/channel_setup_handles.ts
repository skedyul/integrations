/**
 * Handles shared by the channel's `management` config and the tools that
 * report its state. Compliance is one requirements section with a step per
 * item, in this order.
 */
export const COMPLIANCE_SECTION = 'compliance'

export const COMPLIANCE_STEPS = {
  business: 'business',
  address: 'address',
  documents: 'documents',
  review: 'review',
  verification: 'verification',
} as const

/** @deprecated The single item before compliance was split into steps. */
export const COMPLIANCE_ITEM = COMPLIANCE_STEPS.business
