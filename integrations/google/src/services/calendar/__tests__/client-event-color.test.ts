import { describe, expect, it } from '@jest/globals'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { GOOGLE_EVENT_COLOR_PEACOCK, toGoogleEventBody } from '../client'

describe('Google Calendar event color', () => {
  const source = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../client.ts'),
    'utf8',
  )

  it('maps Peacock Blue to Google event colorId 7', () => {
    expect(GOOGLE_EVENT_COLOR_PEACOCK).toBe('7')
  })

  it('hardcodes Peacock on insert and patch bodies', () => {
    expect(toGoogleEventBody({ summary: 'Standup' }).colorId).toBe(
      GOOGLE_EVENT_COLOR_PEACOCK,
    )
    expect(
      toGoogleEventBody(
        { summary: 'Standup', recurrence: ['RRULE:FREQ=DAILY'] },
        { includeRecurrence: false },
      ).colorId,
    ).toBe(GOOGLE_EVENT_COLOR_PEACOCK)
  })

  it('applies the hardcoded color through create and update writes', () => {
    expect(source).toContain('requestBody: toGoogleEventBody(input)')
    expect(source).toContain('requestBody: toGoogleEventBody(input, {')
    expect(source).toContain('colorId: GOOGLE_EVENT_COLOR_PEACOCK')
  })
})
