import { describe, expect, it } from '@jest/globals'
import { toGoogleEventBody } from '../client'

describe('toGoogleEventBody', () => {
  it('does not force a colorId, so events keep their calendar color', () => {
    const body = toGoogleEventBody({
      summary: 'Standup',
      start: '2026-08-24T09:00:00.000Z',
      end: '2026-08-24T09:30:00.000Z',
    })
    expect(body).not.toHaveProperty('colorId')
  })

  it('omits fields that were not provided so a patch leaves them unchanged', () => {
    expect(toGoogleEventBody({ summary: 'Standup' })).toEqual({ summary: 'Standup' })
  })

  it('sends cleared strings and lists so Google clears them', () => {
    expect(
      toGoogleEventBody({ description: '', location: '', attendees: [], recurrence: [] }),
    ).toEqual({ description: '', location: '', attendees: [], recurrence: [] })
  })

  it('writes recurrence lines verbatim, including parameterised EXDATE/RDATE', () => {
    const recurrence = [
      'RRULE:FREQ=WEEKLY;BYDAY=TU;UNTIL=20261231T000000Z',
      'EXDATE;TZID=Australia/Melbourne:20260818T090000',
      'RDATE;VALUE=DATE:20260901',
    ]
    expect(toGoogleEventBody({ recurrence }).recurrence).toEqual(recurrence)
    expect(
      toGoogleEventBody({ recurrence }, { includeRecurrence: false }),
    ).not.toHaveProperty('recurrence')
  })
})
