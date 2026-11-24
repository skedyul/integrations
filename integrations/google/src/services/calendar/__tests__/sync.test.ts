import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import type { GoogleCalendarSummary } from '../client'

type Row = Record<string, unknown>

const instanceList = jest.fn<
  (model: string, args?: { filter?: Record<string, unknown>; limit?: number }) => Promise<{
    data: Row[]
    pagination: { page: number; total: number; hasMore: boolean; limit: number }
  }>
>()
const listGoogleCalendars = jest.fn<() => Promise<GoogleCalendarSummary[]>>()
const getAuthenticatedOAuthClient = jest.fn(async () => ({ client: {} }))

jest.unstable_mockModule('skedyul', async () => {
  const actual = await jest.requireActual<typeof import('skedyul')>('skedyul')
  return { ...actual, instance: { ...actual.instance, list: instanceList } }
})

jest.unstable_mockModule('../client.ts', () => ({ listGoogleCalendars }))

jest.unstable_mockModule('../../../lib/google_client.ts', () => ({
  getAuthenticatedOAuthClient,
}))

const { loadGoogleCalendarRecord, loadLinkedGoogleCalendars } = await import('../sync')

function page(data: Row[]) {
  return { data, pagination: { page: 1, total: data.length, hasMore: false, limit: 50 } }
}

const googlePrimary: GoogleCalendarSummary = {
  calendar_id: 'avin@skedyul.it',
  summary: 'Avin',
  primary: true,
  access_role: 'owner',
  time_zone: 'Pacific/Auckland',
  description: null,
  color: null,
}

describe('loadGoogleCalendarRecord', () => {
  beforeEach(() => {
    instanceList.mockReset()
    listGoogleCalendars.mockReset().mockResolvedValue([googlePrimary])
  })

  it('uses the CRM calendar row (stored sync token) without calling calendarList.list', async () => {
    instanceList.mockResolvedValue(
      page([
        {
          id: 'ins_cal',
          google_calendar_id: 'avin@skedyul.it',
          name: 'Avin',
          sync_enabled: true,
          sync_token: 'tok_stored',
        },
      ]),
    )

    const record = await loadGoogleCalendarRecord('avin@skedyul.it', {})

    expect(instanceList).toHaveBeenCalledWith('calendar', {
      filter: { google_calendar_id: { eq: 'avin@skedyul.it' } },
      limit: 1,
    })
    expect(record).toMatchObject({
      calendar_id: 'avin@skedyul.it',
      crm_instance_id: 'ins_cal',
      sync_token: 'tok_stored',
      summary: 'Avin',
    })
    expect(listGoogleCalendars).not.toHaveBeenCalled()
  })

  it('falls back to the Google calendar list for a calendar never imported', async () => {
    instanceList.mockResolvedValue(page([]))

    const record = await loadGoogleCalendarRecord('avin@skedyul.it', {})

    expect(record).toMatchObject({
      calendar_id: 'avin@skedyul.it',
      crm_instance_id: null,
      sync_token: null,
      timezone: 'Pacific/Auckland',
    })
  })

  it('falls back to Google when the calendar map is not configured', async () => {
    instanceList.mockRejectedValue(new Error('calendar entity is not mapped'))

    await expect(loadGoogleCalendarRecord('avin@skedyul.it', {})).resolves.toMatchObject({
      calendar_id: 'avin@skedyul.it',
    })
  })
})

describe('loadLinkedGoogleCalendars', () => {
  beforeEach(() => {
    instanceList.mockReset()
    listGoogleCalendars.mockReset().mockResolvedValue([googlePrimary])
  })

  it('returns sync-enabled CRM rows only', async () => {
    instanceList.mockResolvedValue(
      page([
        { id: 'a', google_calendar_id: 'a@x', sync_enabled: true, sync_token: 'tok_a' },
        { id: 'b', google_calendar_id: 'b@x', sync_enabled: false },
        { id: 'c', google_calendar_id: 'c@x' },
      ]),
    )

    const records = await loadLinkedGoogleCalendars({})

    expect(records.map((record) => record.calendar_id)).toEqual(['a@x'])
    expect(records[0]?.sync_token).toBe('tok_a')
    expect(listGoogleCalendars).not.toHaveBeenCalled()
  })

  it('falls back to the Google primary calendar before any CRM row exists', async () => {
    instanceList.mockResolvedValue(page([]))

    const records = await loadLinkedGoogleCalendars({})

    expect(records.map((record) => record.calendar_id)).toEqual(['avin@skedyul.it'])
  })

  it('does not call Google in CRM-only mode (scheduled runs)', async () => {
    instanceList.mockResolvedValue(page([]))

    await expect(loadLinkedGoogleCalendars({}, { crmOnly: true })).resolves.toEqual([])
    expect(listGoogleCalendars).not.toHaveBeenCalled()
  })
})
