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

  it('keeps record loaders for batch and push entrypoints', () => {
    expect(typeof sync.loadGoogleCalendarRecord).toBe('function')
    expect(typeof sync.loadLinkedGoogleCalendars).toBe('function')
    expect(typeof sync.loadGoogleCalendarRecordByWatchChannel).toBe('function')
    expect(typeof sync.persistCalendarSyncToken).toBe('function')
  })
})

describe('sync.ts source', () => {
  it('does not emit one app event per listed Google row', () => {
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '../sync.ts'),
      'utf8',
    )
    expect(source).not.toContain('emitGoogleEvent')
    expect(source).not.toContain('calendar.event.created')
    expect(source).not.toContain('calendar.sync.completed')
  })
})
