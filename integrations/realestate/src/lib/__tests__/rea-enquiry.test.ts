import { describe, expect, it } from '@jest/globals'
import {
  buildEnquiryCreatedPayload,
  mapLeadType,
  normalizeReaWebhookEvents,
  transformReaEnquiryRecord,
} from '../rea-enquiry'
import type { ReaEnquiryRecord } from '../../events/types'

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
    expect(entity.lead_type).toBe('buyer')
  })
})

describe('mapLeadType', () => {
  const base: ReaEnquiryRecord = {
    id: 'enquiry-1',
    agencyId: 'ABCDEF',
  }

  it('maps appraisal requests to prospect', () => {
    expect(
      mapLeadType({ ...base, type: 'REALESTATE_COM_AU_SALES_APPRAISAL_REQUEST' }),
    ).toBe('prospect')
    expect(
      mapLeadType({
        ...base,
        type: 'REALESTATE_COM_AU_AGENCY_SALES_APPRAISAL_REQUEST',
      }),
    ).toBe('prospect')
    expect(
      mapLeadType({
        ...base,
        type: 'REALESTATE_COM_AU_RENTAL_APPRAISAL_REQUEST',
      }),
    ).toBe('prospect')
    expect(
      mapLeadType({
        ...base,
        type: 'REALESTATE_COM_AU_AGENCY_RENTAL_APPRAISAL_REQUEST',
      }),
    ).toBe('prospect')
  })

  it('maps rental listing type to tenant', () => {
    expect(mapLeadType({ ...base, type: 'REALESTATE_COM_AU_RENT' })).toBe(
      'tenant',
    )
  })

  it('maps listing enquiries to buyer by default', () => {
    expect(mapLeadType({ ...base, type: 'REALESTATE_COM_AU_LISTING' })).toBe(
      'buyer',
    )
  })

  it('maps listing enquiries to tenant when requestedInformation is rental', () => {
    expect(
      mapLeadType({
        ...base,
        type: 'REALESTATE_COM_AU_LISTING',
        requestedInformation: [
          'know when the property is available and obtain a rental application',
        ],
      }),
    ).toBe('tenant')
  })

  it('maps listing enquiries to tenant when emailSubject is rental', () => {
    expect(
      mapLeadType({
        ...base,
        type: 'REALESTATE_COM_AU_LISTING',
        emailSubject:
          'Enquiry for Property ID: 441195944, 13 Rosella Avenue, Pakenham Vic 3810, Listing Agent Ray White Pakenham Rental Team',
      }),
    ).toBe('tenant')
  })

  it('maps agent, agency, and lead ad enquiries to buyer', () => {
    expect(mapLeadType({ ...base, type: 'REALESTATE_COM_AU_AGENT' })).toBe(
      'buyer',
    )
    expect(mapLeadType({ ...base, type: 'REALESTATE_COM_AU_AGENCY' })).toBe(
      'buyer',
    )
    expect(mapLeadType({ ...base, type: 'REALESTATE_COM_AU_LEAD_AD' })).toBe(
      'buyer',
    )
  })

  it('returns null for unknown types', () => {
    expect(mapLeadType({ ...base, type: 'OTHER' })).toBeNull()
    expect(mapLeadType(base)).toBeNull()
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
