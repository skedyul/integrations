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

  it('reloads the created row then skips Google create when calendar_id is still blank', () => {
    expect(yaml).toContain('cmd: instance.find')
    expect(yaml).toContain('id: "{{ inputs.data.record.id }}"')
    expect(yaml).toContain(
      'if: "{{ steps.resolve-create.outputs.response.data.calendar_id != blank }}"',
    )
    expect(yaml).toContain('toolName: calendar_event_create')
    expect(yaml).toContain('emit_event: "false"')
    expect(yaml).toContain(
      "google_event_id: \"{{ steps.resolve-create.outputs.response.data.google_event_id | default: '' }}\"",
    )
  })

  it('resolves calendar_id from the related calendar when the event string is empty', () => {
    expect(yaml).toContain('google: "unformat", "calendar"')
    expect(yaml).toContain('related_mapped.google_calendar_id')
    expect(yaml).toContain('record.calendar')
    expect(yaml).toContain('calendar_instance_id')
    expect(yaml).toContain('source.calendar_id')
    expect(yaml).toContain('source.google_calendar_id')
  })

  it('uses the CRM title when unformat drops summary', () => {
    expect(yaml).toContain('assign title = record.summary')
    expect(yaml).toContain('assign title = source.summary')
    expect(yaml).toContain('assign title = source.name')
    expect(yaml).toContain('if title != blank')
  })

  it('passes attendees and namespaced send_updates into calendar_event_create', () => {
    expect(yaml).toContain('google:')
    expect(yaml).toContain(
      'attendees: "{{ steps.resolve-create.outputs.response.data.attendees | json }}"',
    )
    expect(yaml).toContain(
      "send_updates: \"{{ inputs.google.send_updates | default: 'externalOnly' }}\"",
    )
  })

  it('writes google_event_id back onto the existing CRM instance', () => {
    expect(yaml).toContain('cmd: instance.update')
    expect(yaml).toContain('instanceId: "{{ inputs.data.record.id }}"')
    expect(yaml).toContain("google: 'format', 'calendar_event'")
    expect(yaml).not.toContain('instance.upsertMany')
  })

  it('is auto-wired on calendar event setup', () => {
    expect(setup).toContain("'push-calendar-event-create-to-google'")
    expect(setup).toContain("'push-calendar-event-update-to-google'")
  })
})
