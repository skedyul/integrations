import { describe, expect, it } from '@jest/globals'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

describe('listGoogleCalendarEvents', () => {
  const source = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../client.ts'),
    'utf8',
  )

  it('defaults events.list to singleEvents false so import stores masters and exceptions', () => {
    expect(source).toContain('singleEvents: options.singleEvents ?? false')
    expect(source).not.toContain('singleEvents: true')
  })
})
