import { describe, expect, it } from '@jest/globals'
import { calendarEventTypes } from '../google-events'

describe('calendarEventTypes', () => {
  it('includes CRM event updated so outbound rename shows under live events', () => {
    expect(calendarEventTypes.map((event) => event.type)).toEqual([
      'app.google.calendar.event.created',
      'app.google.calendar.event.updated',
      'app.google.calendar.event.deleted',
      'instance.updated',
    ])
    const crm = calendarEventTypes.find((event) => event.type === 'instance.updated')
    expect(crm?.recommendedWorkflowHandle).toBe(
      'push-calendar-event-rename-to-google',
    )
  })
})
