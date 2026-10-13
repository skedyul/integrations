import { describe, expect, it } from '@jest/globals'
import { countSmsSegments, sumSmsSegmentCredits } from './sms_segments'

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
