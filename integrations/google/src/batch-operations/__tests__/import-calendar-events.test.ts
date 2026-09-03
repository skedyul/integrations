import { describe, expect, it } from '@jest/globals'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

describe('import_calendar_events source', () => {
  const source = readFileSync(join(here, '../import-calendar-events.ts'), 'utf8')
  const helper = readFileSync(join(here, '../../lib/calendar-event-import.ts'), 'utf8')

  it('honors in-memory Google sync tokens and never emits per event', () => {
    expect(source).toContain('use_sync_token')
    expect(source).toContain('iterateCalendarEventImport')
    expect(helper).toContain('syncToken')
    expect(helper).toContain('SYNC_TOKEN_INVALID')
    expect(helper).toContain('toCalendarEntityPayload')
    expect(helper).not.toContain('persistCalendarSyncToken')
    expect(source).not.toContain('persistCalendarSyncToken')
    expect(source).not.toContain('instance.list')
    expect(source).not.toContain('instance.create')
    expect(source).not.toContain('instance.update')
    expect(source).not.toContain('emitGoogleEvent')
    expect(helper).not.toContain('instance.list')
    expect(helper).not.toContain('instance.create')
    expect(helper).not.toContain('instance.update')
    expect(helper).not.toContain('emitGoogleEvent')
  })

  it('imports Google payloads as-is (masters and exceptions, not expanded occurrences)', () => {
    expect(helper).toContain('normalizeGoogleCalendarEvent')
    expect(helper).toContain('listGoogleCalendarEvents')
    expect(source).toContain("entity: 'user', order: 2, wave: 'page'")
    expect(source).toContain("entity: 'attendee', order: 4, wave: 'page'")
    expect(helper).toContain('buildCalendarPeopleCascadeItems')
    expect(helper).toContain('__crmMatch')
  })
})

describe('import_calendars source', () => {
  const source = readFileSync(join(here, '../import-calendars.ts'), 'utf8')

  it('lists Google calendars and writes CRM rows without instance.*', () => {
    expect(source).toContain('listGoogleCalendars')
    expect(source).toContain('toCalendarEntityPayload')
    expect(source).not.toContain('upsertLinkedGoogleCalendars')
    expect(source).not.toContain('instance.list')
    expect(source).not.toContain('instance.create')
    expect(source).not.toContain('instance.update')
  })

  it('cascades events, people, and attendees after calendars', () => {
    expect(source).toContain("entity: 'calendar', order: 1, wave: 'page'")
    expect(source).toContain("entity: 'user', order: 2, wave: 'page'")
    expect(source).toContain("entity: 'calendar_event', order: 3, wave: 'page'")
    expect(source).toContain("entity: 'attendee', order: 4, wave: 'page'")
    expect(source).toContain('iterateCalendarEventImport')
    expect(source).toContain('filterSyncEnabledCalendars')
    expect(source).toContain('useSyncToken: false')
    expect(source).not.toContain('total:')
  })
})
