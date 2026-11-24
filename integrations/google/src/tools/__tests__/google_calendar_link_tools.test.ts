import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import type { GoogleCalendarRecord } from '../../events/types'

type Row = Record<string, unknown>

const isConfigured = jest.fn(async (_model: string) => true)
const upsertMany = jest.fn(async (_model: string, _items: Row[], _match: string) => ({
  results: [{ id: 'ins_new_cal', mode: 'created' as const }],
  errors: [] as Array<{ index: number; error: string }>,
}))
const loadGoogleCalendarRecord =
  jest.fn<(calendarId: string, env: unknown) => Promise<GoogleCalendarRecord | null>>()
const ensureCalendarWatch = jest.fn(async (_auth: unknown, record: GoogleCalendarRecord) => ({
  ...record,
  watch_channel_id: 'ch_new',
}))
const removeCalendarWatch = jest.fn(async (_auth: unknown, _record: GoogleCalendarRecord) => undefined)
const updateCrmCalendarSyncState = jest.fn(async (_record: unknown, _state: Row) => true)
const emitGoogleEvent = jest.fn(async () => ({ emitted: true }))
const ensureSyncSchedulesOnce = jest.fn(async (_id: string) => undefined)

jest.unstable_mockModule('skedyul', async () => {
  const actual = await jest.requireActual<typeof import('skedyul')>('skedyul')
  return {
    ...actual,
    instance: { ...actual.instance, isConfigured, upsertMany },
    isRuntimeContext: () => true,
  }
})
jest.unstable_mockModule('../../lib/google_client.ts', () => ({
  getAuthenticatedOAuthClient: async () => ({ client: {} }),
  mapGoogleAuthError: (error: unknown) => error,
}))
jest.unstable_mockModule('../../services/calendar/sync.ts', () => ({ loadGoogleCalendarRecord }))
jest.unstable_mockModule('../../lib/calendar_link.ts', () => ({
  ensureCalendarWatch,
  removeCalendarWatch,
}))
jest.unstable_mockModule('../../lib/crm-calendars.ts', () => ({ updateCrmCalendarSyncState }))
jest.unstable_mockModule('../../lib/emit-google-event.ts', () => ({ emitGoogleEvent }))
jest.unstable_mockModule('../../lib/sync-schedules.ts', () => ({ ensureSyncSchedulesOnce }))

const { addGoogleCalendarRegistry } = await import('../add_google_calendar')
const { removeGoogleCalendarRegistry } = await import('../remove_google_calendar')

const context = { appInstallationId: 'inst_1', env: {} } as never

const crmRow: GoogleCalendarRecord = {
  id: 'ins_cal',
  calendar_id: 'room@x',
  crm_instance_id: 'ins_cal',
  summary: 'Room',
  sync_enabled: false,
  watch_channel_id: 'ch_old',
  watch_resource_id: 'res_old',
  watch_token: 'secret',
}

describe('add_google_calendar', () => {
  beforeEach(() => {
    isConfigured.mockClear()
    upsertMany.mockClear()
    ensureCalendarWatch.mockClear()
    removeCalendarWatch.mockClear()
    updateCrmCalendarSyncState.mockClear()
    loadGoogleCalendarRecord.mockReset().mockResolvedValue(crmRow)
  })

  it('saves the sync flags on the CRM row and opens a stored push channel', async () => {
    const result = await addGoogleCalendarRegistry.handler(
      { calendar_id: 'room@x', sync_enabled: true, sync_direction: 'both', external_read_only: false },
      context,
    )

    expect(updateCrmCalendarSyncState).toHaveBeenCalledWith(crmRow, {
      sync_enabled: true,
      sync_direction: 'both',
      external_read_only: false,
    })
    expect(ensureCalendarWatch).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ calendar_id: 'room@x', sync_enabled: true }),
    )
    expect(result).toMatchObject({ success: true, output: { live_sync: true } })
    expect(ensureSyncSchedulesOnce).toHaveBeenCalledWith('inst_1')
  })

  it('creates the CRM row (with flags) for a calendar that was never imported', async () => {
    loadGoogleCalendarRecord.mockResolvedValue({ id: 'room@x', calendar_id: 'room@x', crm_instance_id: null, primary: false })

    await addGoogleCalendarRegistry.handler(
      { calendar_id: 'room@x', sync_enabled: true, sync_direction: 'pull', external_read_only: false },
      context,
    )

    expect(upsertMany).toHaveBeenCalledWith(
      'calendar',
      [expect.objectContaining({ google_calendar_id: 'room@x', sync_enabled: true, sync_direction: 'pull' })],
      'google_calendar_id',
    )
    expect(ensureCalendarWatch.mock.calls[0]?.[1]).toMatchObject({ crm_instance_id: 'ins_new_cal' })
  })

  it('stops the channel when sync is turned off', async () => {
    await addGoogleCalendarRegistry.handler(
      { calendar_id: 'room@x', sync_enabled: false, sync_direction: 'both', external_read_only: false },
      context,
    )

    expect(removeCalendarWatch).toHaveBeenCalled()
    expect(ensureCalendarWatch).not.toHaveBeenCalled()
  })
})

describe('remove_google_calendar', () => {
  beforeEach(() => {
    removeCalendarWatch.mockClear()
    updateCrmCalendarSyncState.mockClear()
    loadGoogleCalendarRecord.mockReset().mockResolvedValue({ ...crmRow, sync_enabled: true })
  })

  it('stops the push channel and turns sync off on the CRM row', async () => {
    const result = await removeGoogleCalendarRegistry.handler({ calendar_id: 'room@x' }, context)

    expect(removeCalendarWatch).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ watch_channel_id: 'ch_old' }),
    )
    expect(updateCrmCalendarSyncState).toHaveBeenCalledWith(
      expect.objectContaining({ crm_instance_id: 'ins_cal' }),
      { sync_enabled: false },
    )
    expect(result).toMatchObject({ success: true, output: { removed: true } })
  })
})
