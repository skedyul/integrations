import type { InboundGroupParticipant } from './inbound_group'

const MEMBER_CAP = 200
const LOOKUP_BUDGET_MS = 4000

type GraphParticipant = { wa_id?: string }
type GraphParticipantList = {
  data?: GraphParticipant[]
  paging?: { next?: string }
}

type GraphGroup = {
  subject?: string
  participants?: GraphParticipant[] | GraphParticipantList
  error?: { message?: string; code?: number }
}

export type WhatsAppRoomProfile = {
  name?: string
  participants: InboundGroupParticipant[]
}

function logWhatsAppLookup(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  console.log(`[whatsapp] group lookup failed: ${message}`)
}

function participantIds(raw: GraphGroup['participants']): { ids: string[]; next?: string } {
  if (Array.isArray(raw)) {
    return {
      ids: raw
        .map((person) => person.wa_id?.trim())
        .filter((id): id is string => !!id),
    }
  }
  const page = raw?.data ?? []
  return {
    ids: page
      .map((person) => person.wa_id?.trim())
      .filter((id): id is string => !!id),
    next: raw?.paging?.next,
  }
}

async function readGroup(url: string, accessToken: string, signal: AbortSignal): Promise<GraphGroup> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal,
  })
  const body = (await response.json()) as GraphGroup
  if (!response.ok || body.error) {
    throw new Error(body.error?.message || `HTTP ${response.status}`)
  }
  return body
}

/**
 * Group subject and the people WhatsApp currently lists in the room.
 * Names come from the message contacts when WhatsApp includes them. A failed
 * lookup returns no subject so the message can still be stored.
 */
export async function describeWhatsAppGroup(input: {
  accessToken: string
  groupId: string
  graphVersion?: string
  budgetMs?: number
}): Promise<WhatsAppRoomProfile> {
  const version = input.graphVersion || process.env.GRAPH_API_VERSION || 'v24.0'
  const signal = AbortSignal.timeout(input.budgetMs ?? LOOKUP_BUDGET_MS)
  const first = new URL(`https://graph.facebook.com/${version}/${encodeURIComponent(input.groupId)}`)
  first.searchParams.set('fields', 'subject,participants')

  try {
    const body = await readGroup(first.toString(), input.accessToken, signal)
    const ids: string[] = []
    let page = participantIds(body.participants)
    for (const id of page.ids) {
      if (!ids.includes(id) && ids.length < MEMBER_CAP) ids.push(id)
    }
    while (page.next && ids.length < MEMBER_CAP && !signal.aborted) {
      const nextBody = await readGroup(page.next, input.accessToken, signal)
      page = participantIds(nextBody.participants)
      for (const id of page.ids) {
        if (!ids.includes(id) && ids.length < MEMBER_CAP) ids.push(id)
      }
    }
    const name = body.subject?.trim() || undefined
    return {
      name,
      participants: ids.map((identifierValue) => ({ identifierValue })),
    }
  } catch (error) {
    logWhatsAppLookup(error)
    return { participants: [] }
  }
}
