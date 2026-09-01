import { describe, expect, it } from '@jest/globals'
import {
  enquiryCreatedEventType,
  enquiryEventTypes,
  enquiryWorkflowHandle,
} from '../rea-events'

describe('REA EventWiringPanel catalog', () => {
  it('declares the full enquiry subscription type and bundled workflow handle', () => {
    expect(enquiryCreatedEventType).toBe('app.realestate.enquiry.created')
    expect(enquiryWorkflowHandle).toBe('sync-rea-enquiry-from-webhook')
    expect(enquiryEventTypes).toEqual([
      expect.objectContaining({
        type: 'app.realestate.enquiry.created',
        label: 'Enquiry created',
        direction: 'inbound',
      }),
    ])
  })
})
