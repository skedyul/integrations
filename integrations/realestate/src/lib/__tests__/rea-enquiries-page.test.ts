import { describe, expect, it } from '@jest/globals'
import { extractEmbeddedEnquiries, extractNextHref } from '../rea-client'

describe('extractEmbeddedEnquiries', () => {
  it('prefers the documented HAL _embedded.enquiries key', () => {
    const enquiries = extractEmbeddedEnquiries({
      _embedded: {
        enquiries: [{ id: 'a', agencyId: 'GHBDWE' }],
      },
    })
    expect(enquiries).toEqual([{ id: 'a', agencyId: 'GHBDWE' }])
  })

  it('accepts singular _embedded.enquiry used by older samples', () => {
    expect(
      extractEmbeddedEnquiries({
        _embedded: {
          enquiry: [{ id: 'b', agencyId: 'ABCDEF' }],
        },
      }),
    ).toEqual([{ id: 'b', agencyId: 'ABCDEF' }])
  })

  it('does not treat a missing enquiries key as data', () => {
    expect(extractEmbeddedEnquiries({ _embedded: {} })).toEqual([])
  })
})

describe('extractNextHref', () => {
  it('reads HAL next.href', () => {
    expect(
      extractNextHref({
        _links: { next: { href: 'https://api.realestate.com.au/lead/v1/enquiries?page=2' } },
      }),
    ).toBe('https://api.realestate.com.au/lead/v1/enquiries?page=2')
  })

  it('returns null when next is missing', () => {
    expect(extractNextHref({ _links: { self: { href: '/lead/v1/enquiries' } } })).toBeNull()
  })
})
