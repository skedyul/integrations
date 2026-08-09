import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  mapTwilioCallStatus,
  isTerminalTwilioStatus,
} from './mapTwilioCallStatus'

describe('mapTwilioCallStatus', () => {
  it('maps in-progress to IN_PROGRESS', () => {
    assert.equal(mapTwilioCallStatus('in-progress'), 'IN_PROGRESS')
  })

  it('maps queued/initiated/ringing to RINGING', () => {
    assert.equal(mapTwilioCallStatus('queued'), 'RINGING')
    assert.equal(mapTwilioCallStatus('initiated'), 'RINGING')
    assert.equal(mapTwilioCallStatus('ringing'), 'RINGING')
  })

  it('maps completed to ENDED', () => {
    assert.equal(mapTwilioCallStatus('completed'), 'ENDED')
  })

  it('maps busy to DECLINED', () => {
    assert.equal(mapTwilioCallStatus('busy'), 'DECLINED')
  })

  it('maps no-answer / canceled to MISSED', () => {
    assert.equal(mapTwilioCallStatus('no-answer'), 'MISSED')
    assert.equal(mapTwilioCallStatus('canceled'), 'MISSED')
    assert.equal(mapTwilioCallStatus('cancelled'), 'MISSED')
  })

  it('maps failed to FAILED', () => {
    assert.equal(mapTwilioCallStatus('failed'), 'FAILED')
  })

  it('is case-insensitive and defaults unknown to RINGING', () => {
    assert.equal(mapTwilioCallStatus('IN-PROGRESS'), 'IN_PROGRESS')
    assert.equal(mapTwilioCallStatus('something-weird'), 'RINGING')
    assert.equal(mapTwilioCallStatus(null), 'RINGING')
    assert.equal(mapTwilioCallStatus(undefined), 'RINGING')
  })
})

describe('isTerminalTwilioStatus', () => {
  it('recognizes terminal statuses', () => {
    for (const s of ['completed', 'busy', 'no-answer', 'canceled', 'failed']) {
      assert.equal(isTerminalTwilioStatus(s), true)
    }
  })

  it('rejects non-terminal statuses', () => {
    for (const s of ['queued', 'ringing', 'in-progress', null, undefined]) {
      assert.equal(isTerminalTwilioStatus(s), false)
    }
  })
})
