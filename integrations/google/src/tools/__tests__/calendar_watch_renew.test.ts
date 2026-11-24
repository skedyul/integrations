import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import type { GoogleCalendarRecord } from '../../events/types'
import type { WatchReconcileSummary } from '../../lib/calendar_link'

const listCrmCalendarRecords = jest.fn<() => Promise<GoogleCalendarRecord[]>>()
const reconcileCalendarWatches = jest.fn<
  (auth: unknown, records: GoogleCalendarRecord[]) => Promise<WatchReconcileSummary>
>()
const getAuthenticatedOAuthClient = jest.fn<() => Promise<{ client: object }>>()

jest.unstable_mockModule('../../lib/crm-calendars.ts', () => ({ listCrmCalendarRecords }))
jest.unstable_mockModule('../../lib/calendar_link.ts', () => ({ reconcileCalendarWatches }))
jest.unstable_mockModule('../../lib/google_client.ts', () => ({ getAuthenticatedOAuthClient }))

const { calendarWatchRenewRegistry } = await import('../calendar_watch_renew')
const { TokenRefreshRequiredError } = await import('skedyul')

const cronContext = {
  appInstallationId: 'inst_1',
  env: {},
  trigger: 'cron',
  cron: { subscriptionId: 'crsub_1', scheduledTime: new Date(), cursor: null },
} as never

const empty: WatchReconcileSummary = {
  created: [],
  renewed: [],
  stopped: [],
  unchanged: [],
  unsupported: [],
  failed: [],
}

describe('calendar_watch_renew', () => {
  beforeEach(() => {
    listCrmCalendarRecords.mockReset().mockResolvedValue([
      { id: 'a', calendar_id: 'a', sync_enabled: true },
      { id: 'b', calendar_id: 'b', sync_enabled: true },
    ])
    reconcileCalendarWatches.mockReset().mockResolvedValue({ ...empty, renewed: ['a'], unchanged: ['b'] })
    getAuthenticatedOAuthClient.mockReset().mockResolvedValue({ client: {} })
  })

  it('reconciles the CRM calendar rows and reports what changed', async () => {
    const result = await calendarWatchRenewRegistry.handler({}, cronContext)

    expect(reconcileCalendarWatches).toHaveBeenCalledWith({}, [
      { id: 'a', calendar_id: 'a', sync_enabled: true },
      { id: 'b', calendar_id: 'b', sync_enabled: true },
    ])
    expect(result).toMatchObject({
      success: true,
      output: { calendars: 2, renewed: ['a'], unchanged: ['b'] },
    })
  })

  it('is a no-op without calendar rows (or before the calendar map exists)', async () => {
    listCrmCalendarRecords.mockRejectedValueOnce(new Error('not mapped'))
    const unmapped = await calendarWatchRenewRegistry.handler({}, cronContext)
    listCrmCalendarRecords.mockResolvedValueOnce([])
    const empty = await calendarWatchRenewRegistry.handler({}, cronContext)

    expect(unmapped).toMatchObject({ success: true, output: { calendars: 0 } })
    expect(empty).toMatchObject({ success: true, output: { calendars: 0 } })
    expect(getAuthenticatedOAuthClient).not.toHaveBeenCalled()
  })

  it('returns a structured error when every attempted change failed', async () => {
    reconcileCalendarWatches.mockResolvedValue({
      ...empty,
      failed: [{ calendar_id: 'a', error: 'backend error' }],
    })

    const result = await calendarWatchRenewRegistry.handler({}, cronContext)

    expect(result).toMatchObject({
      success: false,
      error: { code: 'EXTERNAL_SERVICE_ERROR', message: expect.stringContaining('backend error') },
    })
  })

  it('succeeds when only some calendars failed', async () => {
    reconcileCalendarWatches.mockResolvedValue({
      ...empty,
      created: ['b'],
      failed: [{ calendar_id: 'a', error: 'backend error' }],
    })

    const result = await calendarWatchRenewRegistry.handler({}, cronContext)

    expect(result).toMatchObject({ success: true, output: { failed: [{ calendar_id: 'a' }] } })
  })

  it('asks the platform to refresh an expired access token', async () => {
    getAuthenticatedOAuthClient.mockRejectedValue(
      new TokenRefreshRequiredError('Access token expired', { tokenKey: 'GOOGLE_ACCESS_TOKEN' }),
    )

    const result = await calendarWatchRenewRegistry.handler({}, cronContext)

    expect(result).toMatchObject({ success: false, error: { code: 'TOKEN_REFRESH_REQUIRED' } })
  })
})
