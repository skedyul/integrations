import { describe, expect, it } from '@jest/globals'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const yamlPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../workflows/sync-google-calendar-from-webhook.yml',
)

function extractAppInputTypes(yaml: string): string[] {
  return [...yaml.matchAll(/type:\s*"(@app\/google\/[^"]+)"/g)].map((match) => match[1]!)
}

function inputTypeMatchesEvent(inputType: string, eventType: string): boolean {
  const rest = inputType.replace('@app/google/', '')
  const eventName = rest.replaceAll('/', '.')
  const subscriptionName = eventType.replace('app.google.', '')
  if (eventName.endsWith('.*') || eventName.endsWith('*')) {
    const prefix = eventName.replace(/\.\*$/, '').replace(/\*$/, '')
    return (
      subscriptionName === prefix || subscriptionName.startsWith(`${prefix}.`)
    )
  }
  return subscriptionName === eventName
}

describe('sync-google-calendar-from-webhook inputs', () => {
  const yaml = readFileSync(yamlPath, 'utf8')
  const types = extractAppInputTypes(yaml)

  it('declares created/updated/deleted only — not calendar/*', () => {
    expect(types).toEqual([
      '@app/google/calendar/created',
      '@app/google/calendar/updated',
      '@app/google/calendar/deleted',
    ])
    expect(yaml).not.toContain('@app/google/calendar/*')
  })

  it('does not expand to calendar.event.*', () => {
    expect(
      types.some((type) =>
        inputTypeMatchesEvent(type, 'app.google.calendar.event.updated'),
      ),
    ).toBe(false)
    expect(
      types.some((type) =>
        inputTypeMatchesEvent(type, 'app.google.calendar.created'),
      ),
    ).toBe(true)
  })
})
