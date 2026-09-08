import { describe, expect, it } from '@jest/globals'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveSendUpdates } from '../client'

describe('Google Calendar sendUpdates', () => {
  const source = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../client.ts'),
    'utf8',
  )

  it('defaults missing values to externalOnly', () => {
    expect(resolveSendUpdates(undefined)).toBe('externalOnly')
    expect(resolveSendUpdates('all')).toBe('all')
    expect(resolveSendUpdates('none')).toBe('none')
  })

  it('passes sendUpdates as a query param on insert and patch', () => {
    expect(source).toContain('sendUpdates: resolveSendUpdates(input.send_updates)')
    expect(source).not.toContain('sendUpdates: input')
  })
})
