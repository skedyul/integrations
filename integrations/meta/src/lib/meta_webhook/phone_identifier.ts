export function phoneDigits(value: string): string {
  return value.replace(/\D/g, '')
}

/** Meta display numbers include spaces. CRM phone fields are stored as E.164. */
export function toE164Phone(value: string): string {
  const digits = phoneDigits(value)
  if (!digits) return value.trim()
  return `+${digits}`
}

/**
 * Values to try against a CRM phone filter. The filter compares the raw stored
 * string, which is E.164, while the channel identifier often keeps spaces.
 */
export function whatsappPhoneLookupKeys(identifier: string): string[] {
  return [
    ...new Set(
      [identifier.trim(), toE164Phone(identifier), phoneDigits(identifier)].filter(
        (key) => key.length > 0,
      ),
    ),
  ]
}

export type ChannelCandidate = {
  id: string
  handle?: string
  identifierValue: string
}

/**
 * Pick the channel for this Meta product.
 * A phone channel that shares the number is never selected.
 * WhatsApp also matches when one side is E.164 and the other keeps Meta's spaced display number.
 */
export function pickChannel(
  channels: ChannelCandidate[],
  input: { channelHandle: string; channelIdentifier: string },
): ChannelCandidate | undefined {
  const sameHandle = channels.filter(
    (channel) => channel.handle === undefined || channel.handle === input.channelHandle,
  )
  const exact = sameHandle.find(
    (channel) => channel.identifierValue === input.channelIdentifier,
  )
  if (exact) return exact
  if (input.channelHandle !== 'whatsapp') return undefined

  const wanted = phoneDigits(input.channelIdentifier)
  if (!wanted) return undefined
  return sameHandle.find((channel) => phoneDigits(channel.identifierValue) === wanted)
}
