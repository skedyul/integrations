import { describe, expect, it } from '@jest/globals'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const yamlPath = join(
  process.cwd(),
  'workflows/push-calendar-event-create-to-google.yml',
)
const setupPath = join(process.cwd(), 'src/provision/setup.ts')

describe('push-calendar-event-create-to-google', () => {
  const yaml = readFileSync(yamlPath, 'utf8')
  const setup = readFileSync(setupPath, 'utf8')

  it('subscribes to any mapped CRM model create, not Google inbound events', () => {
    expect(yaml).toContain('type: "@crm/*/created"')
    expect(yaml).not.toContain('@crm/calendar_event/created')
    expect(yaml).not.toContain('@app/google/calendar/event')
  })

  it('skips Google create when calendar_id is blank', () => {
    expect(yaml).toContain(
      'if: "{{ steps.build-create.outputs.response.data.calendar_id != blank }}"',
    )
    expect(yaml).toContain('toolName: calendar_event_create')
  })

  it('resolves calendar_id from the related calendar when the event string is empty', () => {
    expect(yaml).toContain('google: "unformat", "calendar"')
    expect(yaml).toContain('related_mapped.google_calendar_id')
    expect(yaml).toContain('record.calendar')
  })

  it('is registered for deploy but not auto-wired on install', () => {
    expect(setup).toContain("'push-calendar-event-update-to-google'")
    expect(setup).not.toContain('push-calendar-event-create-to-google')
  })
})
