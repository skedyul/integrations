import { describe, expect, it } from '@jest/globals'
import { calendarEventTypes } from '../google-events'

describe('calendarEventTypes', () => {
  it('includes CRM events for bidirectional sync', () => {
    expect(calendarEventTypes.map((event) => event.type)).toEqual([
      'app.google.calendar.event.created',
      'app.google.calendar.event.updated',
      'app.google.calendar.event.deleted',
      'instance.created',
      'instance.updated',
      'instance.deleted',
    ])
  })

  it('has correct direction for inbound events', () => {
    const inboundEvents = calendarEventTypes.filter(
      (event) => event.type.startsWith('app.google'),
    )
    expect(inboundEvents.every((event) => event.direction === 'inbound')).toBe(true)
  })

  it('has correct direction and workflow handles for outbound events', () => {
    const created = calendarEventTypes.find((event) => event.type === 'instance.created')
    expect(created?.direction).toBe('outbound')
    expect(created?.recommendedWorkflowHandle).toBe('push-calendar-event-create-to-google')

    const updated = calendarEventTypes.find((event) => event.type === 'instance.updated')
    expect(updated?.direction).toBe('outbound')
    expect(updated?.recommendedWorkflowHandle).toBe('push-calendar-event-update-to-google')

    const deleted = calendarEventTypes.find((event) => event.type === 'instance.deleted')
    expect(deleted?.direction).toBe('outbound')
    expect(deleted?.recommendedWorkflowHandle).toBe('push-calendar-event-delete-to-google')
  })
})
