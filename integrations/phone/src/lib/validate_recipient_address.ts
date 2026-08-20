import { parsePhoneNumber } from 'libphonenumber-js'

export type RecipientAddressInput = {
  address: string
  renderedBody: string
}

export function isValidRecipientAddress(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false

  try {
    const parsed = parsePhoneNumber(trimmed)
    return parsed.isValid()
  } catch {
    return false
  }
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
