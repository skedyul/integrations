import { beforeEach, describe, expect, it, jest } from '@jest/globals'

const loadGoogleCalendarRecord = jest.fn()
const ensureCalendarWatch = jest.fn()
const syncGoogleCalendar = jest.fn()

jest.unstable_mockModule('../../services/calendar/sync.ts', () => ({
  loadGoogleCalendarRecord,
  syncGoogleCalendar,
}))

jest.unstable_mockModule('../calendar_link.ts', () => ({
  ensureCalendarWatch,
}))

const { runPrimaryCalendarBackfill } = await import('../run-install-backfill')

describe('runPrimaryCalendarBackfill', () => {
  const auth = {} as never

  beforeEach(() => {
    loadGoogleCalendarRecord.mockReset()
    ensureCalendarWatch.mockReset()
    syncGoogleCalendar.mockReset()
  })

  it('returns without throwing when no primary calendar is present', async () => {
    await expect(
      runPrimaryCalendarBackfill({
        auth,
        appInstallationId: 'inst_1',
        primaryCalendarId: null,
      }),
    ).resolves.toBeUndefined()
    expect(loadGoogleCalendarRecord).not.toHaveBeenCalled()
  })

  it('swallows watch/sync failures so OAuth can still persist tokens', async () => {
    loadGoogleCalendarRecord.mockResolvedValue({
      id: 'rec_1',
      calendar_id: 'primary',
      sync_enabled: true,
    })
    ensureCalendarWatch.mockResolvedValue({
      id: 'rec_1',
      calendar_id: 'primary',
      sync_enabled: true,
    })
    syncGoogleCalendar.mockRejectedValue(new Error('SYNC_FAILED'))

    const warn = jest.fn()
    await expect(
      runPrimaryCalendarBackfill({
        auth,
        appInstallationId: 'inst_1',
        primaryCalendarId: 'primary',
        log: { info: jest.fn(), warn },
      }),
    ).resolves.toBeUndefined()

    expect(warn).toHaveBeenCalled()
    expect(String(warn.mock.calls[0]?.[0])).toContain('Install backfill failed')
  })
})
