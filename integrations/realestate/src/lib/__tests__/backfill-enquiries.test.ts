import { describe, expect, it, beforeEach, jest } from '@jest/globals'
import { resetReaClientTokenCache } from '../rea-client'

const instanceList = jest.fn<(...args: unknown[]) => Promise<{ data: unknown[] }>>()
const findActiveAgencyByOwnerId = jest.fn<(ownerId: string) => Promise<{
  id: string
  agency_id: string
  integration_id: string
  scopes: string
  has_lead_scope: boolean
  status: 'ACTIVE' | 'REVOKED'
} | null>>()
const createReaEvent = jest.fn<(...args: unknown[]) => Promise<{ emitted: boolean }>>()

jest.unstable_mockModule('skedyul', () => ({
  instance: { list: instanceList },
}))

jest.unstable_mockModule('../reconcile-agencies', () => ({
  findActiveAgencyByOwnerId,
}))

jest.unstable_mockModule('../create-rea-event', () => ({
  createReaEvent,
}))

jest.unstable_mockModule('../../events/schemas', () => ({
  parseReaEventPayload: (_name: string, payload: unknown) => payload,
}))

const { backfillReaEnquiries, parseBackfillTimestamp } = await import('../backfill-enquiries')

const GHBDWE_ENQUIRY = {
  id: 'enq-missed',
  agencyId: 'GHBDWE',
  receivedAt: '2026-09-05T12:00:00.000Z',
  type: 'REALESTATE_COM_AU_LISTING',
  contactDetails: { fullName: 'Sam Lead', email: 'sam@example.com', phone: '0400000000' },
  listing: { id: '1001', address: '1 Test St' },
}

function mockReaFetch(options: {
  enquiries?: unknown
  integrations?: Array<Record<string, unknown>>
}) {
  jest.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input)
    if (url.includes('/oauth/token')) {
      return new Response(JSON.stringify({ access_token: 'token', expires_in: 3600 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    if (url.includes('/me/v1/integrations')) {
      return new Response(
        JSON.stringify({
          _embedded: {
            integrations: options.integrations ?? [
              {
                integrationId: 'int-1',
                ownerId: 'GHBDWE',
                ownerType: 'agency',
                scopes: ['lead:enquiries:read'],
              },
            ],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }
    if (url.includes('/lead/v1/enquiries')) {
      const body =
        options.enquiries ??
        ({
          _embedded: { enquiries: [GHBDWE_ENQUIRY] },
        } satisfies Record<string, unknown>)
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return new Response('not found', { status: 404 })
  })
}

describe('parseBackfillTimestamp', () => {
  it('treats a date-only since as start of UTC day', () => {
    expect(parseBackfillTimestamp('2026-09-04', 'since').toISOString()).toBe(
      '2026-09-04T00:00:00.000Z',
    )
  })

  it('treats a date-only until as end of UTC day', () => {
    expect(parseBackfillTimestamp('2026-09-07', 'until').toISOString()).toBe(
      '2026-09-07T23:59:59.999Z',
    )
  })
})

describe('backfillReaEnquiries', () => {
  const env = {
    REA_CLIENT_ID: 'client-id',
    REA_CLIENT_SECRET: 'client-secret',
    REA_LEAD_SUBSCRIPTION_ID: 'sub-lead',
  }

  beforeEach(() => {
    resetReaClientTokenCache()
    jest.restoreAllMocks()
    instanceList.mockReset()
    findActiveAgencyByOwnerId.mockReset()
    createReaEvent.mockReset()
    instanceList.mockResolvedValue({ data: [] })
    findActiveAgencyByOwnerId.mockResolvedValue({
      id: 'ins_agency',
      agency_id: 'GHBDWE',
      integration_id: 'int-1',
      scopes: 'lead:enquiries:read',
      has_lead_scope: true,
      status: 'ACTIVE',
    })
    createReaEvent.mockResolvedValue({ emitted: true })
  })

  it('dry-runs an emit for a GET enquiry that is not in CRM', async () => {
    mockReaFetch({})

    const result = await backfillReaEnquiries(env, {
      since: '2026-09-04T00:14:00Z',
      agency_id: 'GHBDWE',
    })

    expect(result.status).toBe('dry_run')
    expect(result.found).toBe(1)
    expect(result.items[0]).toMatchObject({
      id: 'enq-missed',
      action: 'emit',
    })
    expect(createReaEvent).not.toHaveBeenCalled()
  })

  it('skips CRM rows that already have rea_enquiry_id', async () => {
    mockReaFetch({})
    instanceList.mockResolvedValue({ data: [{ id: 'ins_existing' }] })

    const result = await backfillReaEnquiries(env, {
      since: '2026-09-04T00:14:00Z',
      dry_run: false,
    })

    expect(result.items[0]?.action).toBe('skip_existing')
    expect(result.skipped_existing).toBe(1)
    expect(createReaEvent).not.toHaveBeenCalled()
  })

  it('skips when Ignite has the agency but CRM list returns none', async () => {
    mockReaFetch({})
    findActiveAgencyByOwnerId.mockResolvedValue(null)

    const result = await backfillReaEnquiries(env, {
      since: '2026-09-04T00:14:00Z',
      dry_run: true,
    })

    expect(result.items[0]?.action).toBe('skip_agency')
    expect(result.items[0]?.skip_reason).toMatch(/INTERNAL instance.list/)
    expect(createReaEvent).not.toHaveBeenCalled()
  })

  it('emits enquiry.created with trigger backfill when dry_run is false', async () => {
    mockReaFetch({})

    const result = await backfillReaEnquiries(env, {
      since: '2026-09-04T00:14:00Z',
      dry_run: false,
    })

    expect(result.status).toBe('success')
    expect(result.emitted).toBe(1)
    expect(createReaEvent).toHaveBeenCalledWith(
      'enquiry.created',
      expect.objectContaining({
        enquiry: expect.objectContaining({ rea_enquiry_id: 'enq-missed' }),
      }),
      { correlationId: 'backfill:enq-missed', trigger: 'backfill' },
    )
  })
})
