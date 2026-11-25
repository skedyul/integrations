import { describe, expect, it } from '@jest/globals'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const yamlPath = join(
  process.cwd(),
  'workflows/push-calendar-event-create-to-google.yml',
)

describe('push-calendar-event-create-to-google', () => {
  const yaml = readFileSync(yamlPath, 'utf8')

  it('subscribes to any mapped CRM model create, not Google inbound events', () => {
    expect(yaml).toContain('type: "@crm/*/created"')
    expect(yaml).not.toContain('@crm/calendar_event/created')
    expect(yaml).not.toContain('@app/google/calendar/event')
  })

  it('reloads the created row, skips when calendar_id is blank, and never inserts for a row with a Google id', () => {
    expect(yaml).toContain('cmd: instance.find')
    expect(yaml).toContain('id: "{{ inputs.data.record.id }}"')
    expect(yaml).toContain(
      'if: "{{ steps.resolve-create.outputs.response.data.calendar_id != blank and steps.resolve-create.outputs.response.data.google_event_id == blank }}"',
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

  it('writes google_event_id, etag, link and updated time back onto the existing CRM instance', () => {
    expect(yaml).toContain('cmd: instance.update')
    expect(yaml).toContain('instanceId: "{{ inputs.data.record.id }}"')
    expect(yaml).toContain("google: 'format', 'calendar_event'")
    expect(yaml).toContain(
      '"updated_at": {{ steps.create-google.outputs.response.data.event.updated_at | json }}',
    )
    expect(yaml).not.toContain('instance.upsertMany')
  })

  it('passes recurrence and the CRM instance id (deterministic Google id) to calendar_event_create', () => {
    expect(yaml).toContain('"recurrence": {{ record.recurrence | json }}')
    expect(yaml).toContain(
      'recurrence: "{{ steps.resolve-create.outputs.response.data.recurrence | json }}"',
    )
    expect(yaml).toContain('crm_instance_id: "{{ inputs.data.record.id }}"')
  })

  it('declares the optional calendarEdit envelope input', () => {
    expect(yaml).toMatch(/\n  calendarEdit:\n    type: object\n/)
  })

})
