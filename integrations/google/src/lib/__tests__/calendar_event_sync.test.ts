import { describe, expect, it } from '@jest/globals'
import {
  buildGoogleEventExtendedProperties,
  readSkedyulExtendedProperties,
  shouldEmitGoogleAppEvent,
} from '../calendar_event_sync'

describe('shouldEmitGoogleAppEvent', () => {
  it('emits by default for tool / inbound callers', () => {
    expect(shouldEmitGoogleAppEvent({})).toBe(true)
  })

  it('does not emit when outbound CRM sync stamps skedyul origin', () => {
    expect(shouldEmitGoogleAppEvent({ sync_origin: 'skedyul' })).toBe(false)
    expect(shouldEmitGoogleAppEvent({ emit_app_event: false })).toBe(false)
  })
})

describe('buildGoogleEventExtendedProperties', () => {
  it('returns undefined when there is nothing to stamp', () => {
    expect(buildGoogleEventExtendedProperties({})).toBeUndefined()
  })

  it('stamps private origin and instance id', () => {
    expect(
      buildGoogleEventExtendedProperties({
        sync_origin: 'skedyul',
        skedyul_instance_id: 'ins_1',
      }),
    ).toEqual({
      private: {
        skedyulOrigin: 'skedyul',
        skedyulInstanceId: 'ins_1',
      },
    })
  })
})

describe('readSkedyulExtendedProperties', () => {
  it('reads private origin tags', () => {
    expect(
      readSkedyulExtendedProperties({
        skedyulOrigin: 'skedyul',
        skedyulInstanceId: 'ins_1',
      }),
    ).toEqual({
      origin: 'skedyul',
      skedyul_instance_id: 'ins_1',
    })
  })
})
