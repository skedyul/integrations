import { describe, expect, it } from '@jest/globals'
import provision from '../index'

describe('Google provision', () => {
  it('does not declare internal models — calendars are CRM-mapped entities', () => {
    expect(provision.models).toBeUndefined()
    expect(provision.entities?.map((entity) => entity.handle)).toEqual([
      'calendar',
      'calendar_event',
    ])
  })
})
