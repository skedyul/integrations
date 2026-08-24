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

  it('subscribes to CRM calendar_event updates, not Google inbound events', () => {
    expect(yaml).toContain('type: "@crm/calendar_event/updated"')
    expect(yaml).not.toContain('@app/google/calendar/event')
  })

  it('unformats the CRM row and patches Google with the new title only', () => {
    expect(yaml).toContain('google: "unformat", "calendar_event"')
    expect(yaml).toContain('toolName: calendar_event_update')
    expect(yaml).toContain('summary: "{{ steps.build-update.outputs.response.data.summary }}"')
    expect(yaml).not.toContain('instance.upsertMany')
  })
})
