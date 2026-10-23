export type InboundGroupParticipant = {
  identifierValue: string
  displayName?: string
  avatarUrl?: string | null
}

export type InboundGroup = {
  identifierValue: string
  name?: string
  participants: InboundGroupParticipant[]
}

function person(
  identifierValue: string | undefined,
  displayName?: string,
  avatarUrl?: string,
): InboundGroupParticipant | undefined {
  const id = identifierValue?.trim()
  if (!id) return undefined
  const name = displayName?.trim()
  const avatar = avatarUrl?.trim()
  return {
    identifierValue: id,
    ...(name ? { displayName: name } : {}),
    ...(avatar ? { avatarUrl: avatar } : {}),
  }
}

function dedupe(people: Array<InboundGroupParticipant | undefined>): InboundGroupParticipant[] {
  const byId = new Map<string, InboundGroupParticipant>()
  for (const entry of people) {
    if (!entry) continue
    const previous = byId.get(entry.identifierValue)
    if (!previous) {
      byId.set(entry.identifierValue, entry)
      continue
    }
    const avatarUrl = entry.avatarUrl ?? previous.avatarUrl
    byId.set(entry.identifierValue, {
      identifierValue: entry.identifierValue,
      displayName: entry.displayName ?? previous.displayName,
      ...(avatarUrl !== undefined ? { avatarUrl } : {}),
    })
  }
  return [...byId.values()]
}

/** WhatsApp group: room id, subject when present, and whoever this event names. */
export function groupFromWhatsApp(input: {
  groupId?: string
  subject?: string
  from?: string
  contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>
  members?: Array<{ identifierValue: string; displayName?: string }>
}): InboundGroup | undefined {
  const identifierValue = input.groupId?.trim()
  if (!identifierValue) return undefined
  const sender = input.contacts?.find((contact) => contact.wa_id === input.from)
  const named = (waId: string | undefined, fallback?: string) => {
    const contact = input.contacts?.find((entry) => entry.wa_id === waId)
    return contact?.profile?.name ?? fallback
  }
  const participants = dedupe([
    person(input.from, sender?.profile?.name),
    ...(input.contacts ?? []).map((contact) => person(contact.wa_id, contact.profile?.name)),
    ...(input.members ?? []).map((member) =>
      person(member.identifierValue, named(member.identifierValue, member.displayName)),
    ),
  ])
  const name = input.subject?.trim() || undefined
  return { identifierValue, name, participants }
}

/**
 * Messenger and Instagram stay 1:1 unless the event carries a thread id.
 * The sender is the only participant until a later event names someone else.
 */
export function groupFromMessaging(input: {
  threadId?: string
  threadName?: string
  senderId?: string
  senderName?: string
  senderAvatarUrl?: string
}): InboundGroup | undefined {
  const identifierValue = input.threadId?.trim()
  if (!identifierValue) return undefined
  return {
    identifierValue,
    name: input.threadName?.trim() || undefined,
    participants: dedupe([
      person(input.senderId, input.senderName, input.senderAvatarUrl),
    ]),
  }
}
