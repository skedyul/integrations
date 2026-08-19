import { describe, expect, it } from '@jest/globals'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as sync from '../sync'

describe('calendar sync helpers', () => {
  it('does not export a per-event emit loop', () => {
    expect('syncGoogleCalendar' in sync).toBe(false)
    expect('emitGoogleEvent' in sync).toBe(false)
  })

  it('loads calendars from the Google API and overlays CRM sync_enabled', () => {
    expect(typeof sync.loadGoogleCalendarRecord).toBe('function')
    expect(typeof sync.loadLinkedGoogleCalendars).toBe('function')
    expect(typeof sync.loadGoogleCalendarsFromGoogle).toBe('function')
    expect('loadGoogleCalendarRecordByWatchChannel' in sync).toBe(false)
    expect('persistCalendarSyncToken' in sync).toBe(false)
  })
})

describe('sync.ts source', () => {
  it('does not emit one app event per listed Google row or use instance.*', () => {
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '../sync.ts'),
      'utf8',
    )
    expect(source).not.toContain('emitGoogleEvent')
    expect(source).not.toContain('calendar.event.created')
    expect(source).not.toContain('calendar.sync.completed')
    expect(source).not.toContain('instance.list')
    expect(source).not.toContain('instance.create')
    expect(source).not.toContain('instance.update')
    expect(source).toContain('listCrmCalendarRecords')
    expect(source).toContain('filterSyncEnabledCalendars')
  })
})
