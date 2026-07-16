import { describe, expect, it } from '@jest/globals'
import { parseReaEventPayload } from '../../events/schemas'

describe('parseReaEventPayload', () => {
  it('validates enquiry.created payload', () => {
    const payload = parseReaEventPayload('enquiry.created', {
      webhook: {
        event_type: 'EnquiryCreated',
        event_id: 'event-1',
        event_time: '2026-01-13T03:45:12.789Z',
        owner_id: 'ABCDEF',
        subscription_id: 'sub-1',
      },
      agency: {
        agency_id: 'ABCDEF',
        integration_id: 'integration-1',
      },
      enquiry: {
        rea_enquiry_id: 'enquiry-1',
        rea_agency_id: 'ABCDEF',
        enquiry_type: 'REALESTATE_COM_AU_LISTING',
        comments: null,
        first_name: 'Sarah',
        last_name: 'Smith',
        email: 'sarah@example.com',
        phone: '0401234567',
        postcode: '4020',
        preferred_contact_method: 'PHONE',
        received_at: '2017-07-24T10:58:32.000Z',
        processed_at: null,
        listing_id: '100012345',
        listing_address: '1 Test Street',
        source: null,
      },
    })

    expect(payload.enquiry.email).toBe('sarah@example.com')
  })
})
