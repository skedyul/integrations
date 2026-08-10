import { describe, expect, it } from '@jest/globals'
import {
  mapTwilioCallStatus,
  isTerminalTwilioStatus,
} from './mapTwilioCallStatus'

describe('mapTwilioCallStatus', () => {
  it('maps in-progress to IN_PROGRESS', () => {
    expect(mapTwilioCallStatus('in-progress')).toBe('IN_PROGRESS')
  })

  it('maps queued/initiated/ringing to RINGING', () => {
    expect(mapTwilioCallStatus('queued')).toBe('RINGING')
    expect(mapTwilioCallStatus('initiated')).toBe('RINGING')
    expect(mapTwilioCallStatus('ringing')).toBe('RINGING')
  })

  it('maps completed to ENDED', () => {
    expect(mapTwilioCallStatus('completed')).toBe('ENDED')
  })

  it('maps busy to DECLINED', () => {
    expect(mapTwilioCallStatus('busy')).toBe('DECLINED')
  })

  it('maps no-answer / canceled to MISSED', () => {
    expect(mapTwilioCallStatus('no-answer')).toBe('MISSED')
    expect(mapTwilioCallStatus('canceled')).toBe('MISSED')
    expect(mapTwilioCallStatus('cancelled')).toBe('MISSED')
  })

  it('maps failed to FAILED', () => {
    expect(mapTwilioCallStatus('failed')).toBe('FAILED')
  })

  it('is case-insensitive and defaults unknown to RINGING', () => {
    expect(mapTwilioCallStatus('IN-PROGRESS')).toBe('IN_PROGRESS')
    expect(mapTwilioCallStatus('something-weird')).toBe('RINGING')
    expect(mapTwilioCallStatus(null)).toBe('RINGING')
    expect(mapTwilioCallStatus(undefined)).toBe('RINGING')
  })
})

describe('isTerminalTwilioStatus', () => {
  it('recognizes terminal statuses', () => {
    for (const s of ['completed', 'busy', 'no-answer', 'canceled', 'failed']) {
      expect(isTerminalTwilioStatus(s)).toBe(true)
    }
  })

  it('rejects non-terminal statuses', () => {
    for (const s of ['queued', 'ringing', 'in-progress', null, undefined]) {
      expect(isTerminalTwilioStatus(s)).toBe(false)
    }
  })
})
