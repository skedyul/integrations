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

describe('sync-google-calendar-event-to-google', () => {
  const outboundPath = join(
    dirname(fileURLToPath(import.meta.url)),
    '../../../../workflows/sync-google-calendar-event-to-google.yml',
  )
  const yaml = readFileSync(outboundPath, 'utf8')

  it('listens to CRM events and unformats via the install map', () => {
    expect(yaml).toContain('type: "@crm/event/*"')
    expect(yaml).toContain('google: "unformat", "calendar_event"')
    expect(yaml).toContain('toolName: calendar_event_create')
    expect(yaml).toContain('toolName: calendar_event_update')
    expect(yaml).toContain('toolName: calendar_event_delete')
    expect(yaml).toContain('sync_origin: skedyul')
    expect(yaml).toContain('emit_app_event: false')
    expect(yaml).toContain('skip_outbound')
    expect(yaml).toContain("action == 'delete'")
    expect(yaml).toContain("action == 'create'")
  })

  it('does not hardcode workplace field handles', () => {
    expect(yaml).not.toContain('start_at')
    expect(yaml).not.toContain('end_at')
  })
})
