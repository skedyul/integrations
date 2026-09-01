/**
 * REA app event catalog for install pages (EventWiringPanel).
 */

export type EventDirection = 'inbound' | 'outbound'

export type ReaAppEventDefinition = {
  type: string
  label: string
  description: string
  icon: string
  sourceType?: string
  direction?: EventDirection
  recommendedWorkflowHandle?: string
}

export const enquiryCreatedEventType = 'app.realestate.enquiry.created'

export const enquiryEventTypes: ReaAppEventDefinition[] = [
  {
    type: enquiryCreatedEventType,
    label: 'Enquiry created',
    description: 'A new realestate.com.au enquiry was received',
    icon: 'UserPlus',
    direction: 'inbound',
  },
]

/** Bundled sync workflow handle (created on realestate app install). */
export const enquiryWorkflowHandle = 'sync-rea-enquiry-from-webhook'
