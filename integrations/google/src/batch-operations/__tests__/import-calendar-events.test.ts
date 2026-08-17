import { describe, expect, it } from '@jest/globals'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

describe('import_calendar_events source', () => {
  const source = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../import-calendar-events.ts'),
    'utf8',
  )

  it('honors existing Google sync tokens and never emits per event', () => {
    expect(source).toContain('syncToken')
    expect(source).toContain('use_sync_token')
    expect(source).toContain('SYNC_TOKEN_INVALID')
    expect(source).toContain('persistCalendarSyncToken')
    expect(source).not.toContain('emitGoogleEvent')
  })

  it('imports Google payloads as-is (masters and exceptions, not expanded occurrences)', () => {
    expect(source).toContain('normalizeGoogleCalendarEvent')
    expect(source).toContain('listGoogleCalendarEvents')
  })
})
