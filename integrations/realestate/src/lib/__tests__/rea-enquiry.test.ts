import { describe, expect, it } from '@jest/globals'
import {
  buildEnquiryCreatedPayload,
  enquiryCreatedCorrelationId,
  normalizeReaWebhookEvents,
  splitReaEnquiryEntities,
  transformReaEnquiryRecord,
} from '../rea-enquiry'

describe('normalizeReaWebhookEvents', () => {
  it('parses EnquiryCreated events from webhook payload', () => {
    const events = normalizeReaWebhookEvents({
      events: [
        {
          resourceUrl:
            'https://api.realestate.com.au/lead/v1/enquiries/2bb121ad-2849-4b20-bc40-19e4ae371b7e',
          resourceId: '2bb121ad-2849-4b20-bc40-19e4ae371b7e',
          eventTime: '2026-01-13T03:45:12.789Z',
          eventId: 'c5d6e7f8-9012-3456-7890-abcdef123456',
          eventType: 'EnquiryCreated',
          eventCategory: 'lead',
          ownerId: 'ABCDEF',
          ownerType: 'agency',
          subscriptionId: 'd7e8f9a0-1234-5678-9012-3456789abcde',
        },
      ],
    })

    expect(events).toHaveLength(1)
    expect(events[0]?.ownerId).toBe('ABCDEF')
    expect(events[0]?.eventType).toBe('EnquiryCreated')
  })

  it('returns empty array when events missing', () => {
    expect(normalizeReaWebhookEvents({})).toEqual([])
  })
})

describe('transformReaEnquiryRecord', () => {
  it('maps enquiry fields and splits full name', () => {
    const entity = transformReaEnquiryRecord({
      id: '2bb121ad-2849-4b20-bc40-19e4ae371b7e',
      agencyId: 'ABCDEF',
      type: 'REALESTATE_COM_AU_LISTING',
      comments: 'Interested in inspection',
      receivedAt: '2017-07-24T10:58:32.000Z',
      processedAt: '2017-07-26T03:21:25.090Z',
      contactDetails: {
        fullName: 'Sarah Smith',
        email: 'sarah@example.com',
        phone: '0401234567',
        postcode: '4020',
        preferredContactMethod: 'PHONE',
      },
      listing: {
        id: '100012345',
        address: '1 Test Street, Melbourne, Vic 3000',
      },
      source: {
        type: 'SPONSORED_CONTENT',
        name: 'My campaign',
      },
    })

    expect(entity.rea_enquiry_id).toBe('2bb121ad-2849-4b20-bc40-19e4ae371b7e')
    expect(entity.first_name).toBe('Sarah')
    expect(entity.last_name).toBe('Smith')
    expect(entity.source).toBe('SPONSORED_CONTENT / My campaign')
  })
})

describe('splitReaEnquiryEntities', () => {
  it('splits a flattened lead into customer, property, and enquiry', () => {
    const split = splitReaEnquiryEntities({
      rea_enquiry_id: 'enq-1',
      rea_agency_id: 'ABCDEF',
      enquiry_type: 'REALESTATE_COM_AU_LISTING',
      comments: 'Please call',
      first_name: 'Sarah',
      last_name: 'Smith',
      email: 'sarah@example.com',
      phone: '0401234567',
      postcode: '4020',
      preferred_contact_method: 'PHONE',
      received_at: '2017-07-24T10:58:32.000Z',
      processed_at: '2017-07-26T03:21:25.090Z',
      listing_id: '100012345',
      listing_address: '1 Test Street, Melbourne, Vic 3000',
      source: 'SPONSORED_CONTENT / My campaign',
    })

    expect(split.customer).toEqual({
      first_name: 'Sarah',
      last_name: 'Smith',
      email: 'sarah@example.com',
      phone: '0401234567',
      preferred_contact_method: 'PHONE',
    })
    expect(split.property).toEqual({
      listing_id: '100012345',
      address: '1 Test Street, Melbourne, Vic 3000',
    })
    expect(split.enquiry.rea_enquiry_id).toBe('enq-1')
    expect(split.enquiry.postcode).toBe('4020')
    expect(split.enquiry).not.toHaveProperty('first_name')
    expect(split.enquiry).not.toHaveProperty('listing_address')
  })
})

describe('buildEnquiryCreatedPayload', () => {
  it('builds nested event payload envelope', () => {
    const payload = buildEnquiryCreatedPayload({
      webhookEvent: {
        resourceUrl:
          'https://api.realestate.com.au/lead/v1/enquiries/2bb121ad-2849-4b20-bc40-19e4ae371b7e',
        resourceId: '2bb121ad-2849-4b20-bc40-19e4ae371b7e',
        eventTime: '2026-01-13T03:45:12.789Z',
        eventId: 'event-1',
        eventType: 'EnquiryCreated',
        eventCategory: 'lead',
        ownerId: 'ABCDEF',
        ownerType: 'agency',
        subscriptionId: 'sub-1',
      },
      agency: {
        agency_id: 'ABCDEF',
        integration_id: 'integration-1',
      },
      enquiry: {
        id: '2bb121ad-2849-4b20-bc40-19e4ae371b7e',
        agencyId: 'ABCDEF',
        contactDetails: { fullName: 'Sarah Smith' },
      },
    })

    expect(payload.agency.agency_id).toBe('ABCDEF')
    expect(payload.enquiry.rea_enquiry_id).toBe('2bb121ad-2849-4b20-bc40-19e4ae371b7e')
    expect(payload.webhook.event_id).toBe('event-1')
  })
})

describe('enquiryCreatedCorrelationId', () => {
  it('fingerprints contact, listing, type, and received_at', () => {
    expect(
      enquiryCreatedCorrelationId({
        rea_enquiry_id: 'ba7525f8-3b9a-47c1-be04-005a2579c2a6',
        rea_agency_id: 'GHBDWE',
        enquiry_type: 'REALESTATE_COM_AU_SALES_APPRAISAL_REQUEST',
        comments: 'Looking to sell',
        first_name: 'Justin',
        last_name: 'Gagalowicz',
        email: 'Gagz_efxr@yahoo.com.au',
        phone: '0438931940',
        postcode: null,
        preferred_contact_method: 'CALL',
        received_at: '2026-09-17T23:57:21.000Z',
        processed_at: '2026-09-17T23:57:22.027Z',
        listing_id: null,
        listing_address: '12 Fairwood Rise, Officer, VIC 3809',
        source: null,
      }),
    ).toBe(
      'enquiry:REALESTATE_COM_AU_SALES_APPRAISAL_REQUEST:gagz_efxr@yahoo.com.au:0438931940:12 fairwood rise, officer, vic 3809:2026-09-17T23:57:21.000Z',
    )
  })

  it('collapses two REA ids for the same lead', () => {
    const first = enquiryCreatedCorrelationId({
      rea_enquiry_id: 'id-1',
      rea_agency_id: 'GHBDWE',
      enquiry_type: 'REALESTATE_COM_AU_SALES_APPRAISAL_REQUEST',
      comments: null,
      first_name: 'Justin',
      last_name: 'Gagalowicz',
      email: 'Gagz_efxr@yahoo.com.au',
      phone: '+61438931940',
      postcode: null,
      preferred_contact_method: null,
      received_at: '2026-09-17T23:57:21.000Z',
      processed_at: null,
      listing_id: null,
      listing_address: '12 Fairwood Rise, Officer, VIC 3809',
      source: null,
    })
    const second = enquiryCreatedCorrelationId({
      rea_enquiry_id: 'id-2',
      rea_agency_id: 'GHBDWE',
      enquiry_type: 'REALESTATE_COM_AU_SALES_APPRAISAL_REQUEST',
      comments: null,
      first_name: 'Justin',
      last_name: 'Gagalowicz',
      email: 'gagz_efxr@yahoo.com.au',
      phone: '+61438931940',
      postcode: null,
      preferred_contact_method: null,
      received_at: '2026-09-17T23:57:21.000Z',
      processed_at: null,
      listing_id: null,
      listing_address: '12 Fairwood Rise, Officer, VIC 3809',
      source: null,
    })
    expect(first).toBe(second)
  })

  it('returns undefined without contact identity', () => {
    expect(
      enquiryCreatedCorrelationId({
        rea_enquiry_id: 'id-1',
        rea_agency_id: 'GHBDWE',
        enquiry_type: 'REALESTATE_COM_AU_LISTING',
        comments: null,
        first_name: null,
        last_name: null,
        email: null,
        phone: null,
        postcode: null,
        preferred_contact_method: null,
        received_at: '2026-09-17T23:57:21.000Z',
        processed_at: null,
        listing_id: '152224800',
        listing_address: null,
        source: null,
      }),
    ).toBeUndefined()
  })
})
