import { describe, expect, it } from '@jest/globals'
import {
  countSmsSegments,
  meteredSmsBilling,
  sumSmsSegmentCredits,
} from './sms_segments'

describe('sumSmsSegmentCredits', () => {
  it('counts one segment per short message', () => {
    expect(sumSmsSegmentCredits(['hello', 'world'])).toBe(2)
  })

  it('counts concatenated GSM-7 segments', () => {
    const longBody = 'a'.repeat(161)
    expect(countSmsSegments(longBody).segments).toBe(2)
    expect(sumSmsSegmentCredits([longBody, 'ok'])).toBe(3)
  })
})

describe('meteredSmsBilling', () => {
  it('prices segments in USD', () => {
    expect(meteredSmsBilling(2)).toEqual({
      credits: 2,
      cost: 0.14,
      currency: 'USD',
    })
    expect(meteredSmsBilling(1, '0.10')).toEqual({
      credits: 1,
      cost: 0.1,
      currency: 'USD',
    })
  })
})
