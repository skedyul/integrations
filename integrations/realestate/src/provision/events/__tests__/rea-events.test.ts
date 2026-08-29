import { describe, expect, it } from '@jest/globals'
import {
  enquiryCreatedEventType,
  leadEventTypes,
  leadWorkflowHandle,
} from '../rea-events'

describe('REA EventWiringPanel catalog', () => {
  it('declares the full enquiry subscription type and bundled workflow handle', () => {
    expect(enquiryCreatedEventType).toBe('app.realestate.enquiry.created')
    expect(leadWorkflowHandle).toBe('sync-rea-enquiry-from-webhook')
    expect(leadEventTypes).toEqual([
      expect.objectContaining({
        type: 'app.realestate.enquiry.created',
        label: 'Enquiry created',
        direction: 'inbound',
      }),
    ])
  })
})
