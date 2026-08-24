import { describe, expect, it } from '@jest/globals'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const yamlPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../workflows/push-calendar-event-rename-to-google.yml',
)

describe('push-calendar-event-rename-to-google', () => {
  const yaml = readFileSync(yamlPath, 'utf8')

  it('subscribes to any mapped CRM model update, not Google inbound events', () => {
    expect(yaml).toContain('type: "@crm/*/updated"')
    expect(yaml).not.toContain('@crm/calendar_event/updated')
    expect(yaml).not.toContain('@app/google/calendar/event')
  })

  it('unformats the CRM row via the trigger-selected model and patches Google with the new title only', () => {
    expect(yaml).toContain('google: "unformat", inputs.data.model')
    expect(yaml).toContain("'present', inputs.data.model")
    expect(yaml).toContain('toolName: calendar_event_update')
    expect(yaml).toContain('summary: "{{ steps.build-update.outputs.response.data.summary }}"')
    expect(yaml).not.toContain('instance.upsertMany')
  })
})
