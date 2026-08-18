import { describe, expect, it } from '@jest/globals'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

describe('Google provision', () => {
  const source = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../index.ts'),
    'utf8',
  )

  it('does not declare internal models — calendars are CRM-mapped entities', () => {
    expect(source).toContain("entities: [calendar, calendarEvent]")
    expect(source).not.toContain('models:')
    expect(source).not.toContain("from './crm/models")
  })
})
