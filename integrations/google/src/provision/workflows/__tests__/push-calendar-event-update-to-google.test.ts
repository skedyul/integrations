import { describe, expect, it } from '@jest/globals'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const yamlPath = join(
  process.cwd(),
  'workflows/push-calendar-event-update-to-google.yml',
)

describe('push-calendar-event-update-to-google', () => {
  const yaml = readFileSync(yamlPath, 'utf8')

  it('subscribes to any mapped CRM model update, not Google inbound events', () => {
    expect(yaml).toContain('type: "@crm/*/updated"')
    expect(yaml).not.toContain('@crm/calendar_event/updated')
    expect(yaml).not.toContain('@app/google/calendar/event')
  })

  it('unformats before/after and patches Google with the mapped entity payload', () => {
    expect(yaml).toContain('google: "unformat", inputs.data.model')
    expect(yaml).toContain("'present', inputs.data.model")
    expect(yaml).toContain('toolName: calendar_event_update')
    expect(yaml).toContain(
      'if: "{{ steps.build-update.outputs.response.data.calendar_id != blank }}"',
    )
    expect(yaml).not.toContain('instance.upsertMany')
    expect(yaml).not.toContain('summary: "{{ steps.build-update.outputs.response.data.summary }}"')
  })
})
