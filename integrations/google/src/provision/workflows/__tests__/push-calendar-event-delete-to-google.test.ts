import { describe, expect, it } from '@jest/globals'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const yaml = readFileSync(
  join(process.cwd(), 'workflows/push-calendar-event-delete-to-google.yml'),
  'utf8',
)

describe('push-calendar-event-delete-to-google', () => {
  it('subscribes to any mapped CRM model delete', () => {
    expect(yaml).toContain('type: "@crm/*/deleted"')
    expect(yaml).not.toContain('@app/google/calendar/event')
  })

  it('resolves the Google calendar from the relation when the event string is empty', () => {
    expect(yaml).toContain('google: "unformat", "calendar"')
    expect(yaml).toContain('cmd: instance.find')
  })

  it('deletes via calendar_event_delete with guest notifications and without emitting', () => {
    expect(yaml).toContain('toolName: calendar_event_delete')
    expect(yaml).toContain(
      "send_updates: \"{{ inputs.google.send_updates | default: 'externalOnly' }}\"",
    )
    expect(yaml).toContain('emit_event: "false"')
  })
})
