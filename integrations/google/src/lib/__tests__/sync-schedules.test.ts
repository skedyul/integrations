import { beforeEach, describe, expect, it, jest } from '@jest/globals'

const subscribe = jest.fn(async (params: { toolName: string }) => ({
  id: `crsub_${params.toolName}`,
  toolName: params.toolName,
  schedule: '',
  timezone: 'UTC',
}))
const listSubscriptions = jest.fn(async () => ({
  subscriptions: [
    { id: 'crsub_renew', toolName: 'calendar_watch_renew' },
    { id: 'crsub_sync', toolName: 'calendar_sync' },
    { id: 'crsub_other', toolName: 'something_else' },
  ],
}))
const unsubscribe = jest.fn(async (_id: string) => ({ deleted: true }))

jest.unstable_mockModule('skedyul', () => ({
  cron: { subscribe, list: listSubscriptions, unsubscribe },
}))

const {
  ensureSyncSchedules,
  ensureSyncSchedulesOnce,
  removeSyncSchedules,
  resetEnsuredSyncSchedules,
  syncScheduleParams,
} = await import('../sync-schedules')

describe('sync schedules', () => {
  beforeEach(() => {
    subscribe.mockClear()
    unsubscribe.mockClear()
    resetEnsuredSyncSchedules()
  })

  it('renews watches every 6 hours and runs an incremental catch-up every 15 minutes', async () => {
    await ensureSyncSchedules('inst_1')

    const [renew, sync] = subscribe.mock.calls.map((call) => call[0]) as Array<{
      toolName: string
      schedule: string
      cursorKey: string
      inputs: Record<string, unknown>
    }>
    expect(renew).toMatchObject({ toolName: 'calendar_watch_renew', cursorKey: 'calendar_watch_renew' })
    expect(renew?.schedule).toMatch(/^\d{1,2} \*\/6 \* \* \*$/)
    expect(sync).toMatchObject({
      toolName: 'calendar_sync',
      inputs: { enable_live_sync: false },
    })
    const minutes = sync?.schedule.split(' ')[0]?.split(',').map(Number) ?? []
    expect(minutes).toHaveLength(4)
    expect(minutes[1]! - minutes[0]!).toBe(15)
  })

  it('uses a stable per-installation minute so installs do not all fire together', () => {
    expect(syncScheduleParams('inst_1')).toEqual(syncScheduleParams('inst_1'))
    const spread = new Set(
      ['inst_1', 'inst_2', 'inst_3', 'inst_4', 'inst_5'].map(
        (id) => syncScheduleParams(id)[0]?.schedule,
      ),
    )
    expect(spread.size).toBeGreaterThan(1)
  })

  it('subscribes at most once per installation from hot paths and never throws', async () => {
    await ensureSyncSchedulesOnce('inst_1')
    await ensureSyncSchedulesOnce('inst_1')
    expect(subscribe).toHaveBeenCalledTimes(2)

    subscribe.mockRejectedValueOnce(new Error('cron unavailable'))
    await expect(ensureSyncSchedulesOnce('inst_2')).resolves.toBeUndefined()
  })

  it('removes only this app\'s schedules on uninstall', async () => {
    await expect(removeSyncSchedules()).resolves.toBe(2)
    expect(unsubscribe.mock.calls.map((call) => call[0])).toEqual(['crsub_renew', 'crsub_sync'])
  })
})
