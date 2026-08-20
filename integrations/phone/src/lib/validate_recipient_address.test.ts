import { describe, expect, it } from '@jest/globals'
import {
  isSendableRecipient,
  isValidRecipientAddress,
  partitionRecipients,
} from './validate_recipient_address'

describe('isValidRecipientAddress', () => {
  it('accepts valid AU mobiles', () => {
    expect(isValidRecipientAddress('+61411818090')).toBe(true)
    expect(isValidRecipientAddress(' +61422902170 ')).toBe(true)
  })

  it('accepts AU landlines (does not require mobile)', () => {
    expect(isValidRecipientAddress('+61861000015')).toBe(true)
  })

  it('rejects the production invalid Bondi number', () => {
    expect(isValidRecipientAddress('+616584182127')).toBe(false)
  })

  it('rejects blank and non-phone values', () => {
    expect(isValidRecipientAddress('')).toBe(false)
    expect(isValidRecipientAddress('   ')).toBe(false)
    expect(isValidRecipientAddress('not-a-phone')).toBe(false)
  })
})

describe('isSendableRecipient', () => {
  it('requires a valid address and a non-empty body', () => {
    expect(
      isSendableRecipient({ address: '+61411818090', renderedBody: 'Hello' }),
    ).toBe(true)
    expect(
      isSendableRecipient({ address: '+61411818090', renderedBody: '  ' }),
    ).toBe(false)
    expect(
      isSendableRecipient({ address: '+616584182127', renderedBody: 'Hello' }),
    ).toBe(false)
  })
})

describe('partitionRecipients', () => {
  it('splits valid and invalid recipients without failing the batch', () => {
    const { valid, invalid } = partitionRecipients([
      { address: '+61411818090', renderedBody: 'Hello', id: 'a' },
      { address: '+616584182127', renderedBody: 'Hello', id: 'b' },
      { address: '+61422902170', renderedBody: '', id: 'c' },
    ])

    expect(valid.map((recipient) => recipient.id)).toEqual(['a'])
    expect(invalid.map((recipient) => recipient.id)).toEqual(['b', 'c'])
  })
})
