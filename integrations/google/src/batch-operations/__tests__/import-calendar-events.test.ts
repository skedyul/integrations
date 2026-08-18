import { describe, expect, it } from '@jest/globals'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

describe('import_calendar_events source', () => {
  const source = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../import-calendar-events.ts'),
    'utf8',
  )

  it('honors in-memory Google sync tokens and never emits per event', () => {
    expect(source).toContain('syncToken')
    expect(source).toContain('use_sync_token')
    expect(source).toContain('SYNC_TOKEN_INVALID')
    expect(source).toContain('toCalendarEntityPayload')
    expect(source).not.toContain('persistCalendarSyncToken')
    expect(source).not.toContain('instance.list')
    expect(source).not.toContain('instance.create')
    expect(source).not.toContain('instance.update')
    expect(source).not.toContain('emitGoogleEvent')
  })

  it('imports Google payloads as-is (masters and exceptions, not expanded occurrences)', () => {
    expect(source).toContain('normalizeGoogleCalendarEvent')
    expect(source).toContain('listGoogleCalendarEvents')
  })
})

describe('import_calendars source', () => {
  const source = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../import-calendars.ts'),
    'utf8',
  )

  it('lists Google calendars and writes CRM rows without instance.*', () => {
    expect(source).toContain('listGoogleCalendars')
    expect(source).toContain('toCalendarEntityPayload')
    expect(source).not.toContain('upsertLinkedGoogleCalendars')
    expect(source).not.toContain('instance.list')
    expect(source).not.toContain('instance.create')
    expect(source).not.toContain('instance.update')
  })
})
