import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { GoogleCalendarRecord } from '../../events/types'

const listCrmCalendarRecords = jest.fn<() => Promise<GoogleCalendarRecord[]>>()
const reconcileCalendarWatches = jest.fn(async (_auth: unknown, records: GoogleCalendarRecord[]) => ({
  created: records.map((record) => record.calendar_id),
  renewed: [],
  stopped: [],
  unchanged: [],
  unsupported: [],
  failed: [],
}))

jest.unstable_mockModule('../crm-calendars.ts', () => ({ listCrmCalendarRecords }))
jest.unstable_mockModule('../calendar_link.ts', () => ({ reconcileCalendarWatches }))

const { ensureCalendarWatches, ensureCalendarWatchesOnce, resetEnsuredCalendarWatches } =
  await import('../calendar-watches')

const auth = { name: 'oauth' } as never

describe('ensureCalendarWatches', () => {
  beforeEach(() => {
    resetEnsuredCalendarWatches()
    reconcileCalendarWatches.mockClear()
    listCrmCalendarRecords.mockReset().mockResolvedValue([
      { id: 'c1', calendar_id: 'primary', sync_enabled: true } as GoogleCalendarRecord,
    ])
  })

  it('reconciles channels for the mapped calendar rows', async () => {
    await expect(ensureCalendarWatches(auth)).resolves.toMatchObject({ created: ['primary'] })
    expect(reconcileCalendarWatches).toHaveBeenCalledWith(auth, [
      expect.objectContaining({ calendar_id: 'primary' }),
    ])
  })

  it('does nothing before calendars are mapped', async () => {
    listCrmCalendarRecords.mockRejectedValue(new Error('calendar is not mapped'))
    await expect(ensureCalendarWatches(auth)).resolves.toBeNull()
    expect(reconcileCalendarWatches).not.toHaveBeenCalled()
  })

  it('runs once per installation per process, and again after a failure', async () => {
    reconcileCalendarWatches.mockRejectedValueOnce(new Error('rate limited'))
    await ensureCalendarWatchesOnce('inst_1', auth)
    await ensureCalendarWatchesOnce('inst_1', auth)
    await ensureCalendarWatchesOnce('inst_1', auth)

    expect(reconcileCalendarWatches).toHaveBeenCalledTimes(2)
  })
})

describe('no app-owned schedules', () => {
  // Push channels are platform leases (calendar_push.renew) and freshness is
  // event-driven: nothing in the app may subscribe cron schedules.
  it('never calls cron.subscribe', () => {
    const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
    const offenders: string[] = []
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name)
        if (statSync(path).isDirectory()) {
          if (name !== '__tests__') walk(path)
        } else if (name.endsWith('.ts') && /\bcron\.(subscribe|unsubscribe|list)\(/.test(readFileSync(path, 'utf8'))) {
          offenders.push(path)
        }
      }
    }
    walk(root)
    expect(offenders).toEqual([])
  })
})
