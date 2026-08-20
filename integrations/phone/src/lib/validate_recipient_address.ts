import { createRequire } from 'node:module'
import type { parsePhoneNumberFromString as ParsePhoneNumberFromString } from 'libphonenumber-js'

const require = createRequire(import.meta.url)
const { parsePhoneNumberFromString } = require('libphonenumber-js') as {
  parsePhoneNumberFromString: typeof ParsePhoneNumberFromString
}

export type RecipientAddressInput = {
  address: string
  renderedBody: string
}

export function isValidRecipientAddress(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false
  return parsePhoneNumberFromString(trimmed)?.isValid() === true
}

export function isSendableRecipient(recipient: RecipientAddressInput): boolean {
  return (
    isValidRecipientAddress(recipient.address) &&
    recipient.renderedBody.trim() !== ''
  )
}

export function partitionRecipients<T extends RecipientAddressInput>(
  recipients: T[],
): { valid: T[]; invalid: T[] } {
  const valid: T[] = []
  const invalid: T[] = []

  for (const recipient of recipients) {
    if (isSendableRecipient(recipient)) {
      valid.push(recipient)
    } else {
      invalid.push(recipient)
    }
  }

  return { valid, invalid }
}
