import { token } from 'skedyul'
import { SlackClient } from './slack_client'

export type SlackPerson = {
  identifierValue: string
  displayName?: string
  avatarUrl?: string | null
}

export type SlackRoomProfile = {
  name?: string
  participants: SlackPerson[]
}

const MEMBER_CAP = 200
const LOOKUP_BUDGET_MS = 1500

type SlackUser = {
  id?: string
  is_bot?: boolean
  real_name?: string
  name?: string
  profile?: { display_name?: string; real_name?: string; image_72?: string }
}

type SlackChannel = {
  name?: string
  is_im?: boolean
  is_mpim?: boolean
}

function personFromUser(user: SlackUser | undefined): SlackPerson | undefined {
  const identifierValue = user?.id?.trim()
  if (!identifierValue || user?.is_bot || identifierValue === 'USLACKBOT') return undefined
  const displayName =
    user?.profile?.display_name?.trim() ||
    user?.profile?.real_name?.trim() ||
    user?.real_name?.trim() ||
    user?.name?.trim() ||
    undefined
  const avatarUrl = user?.profile?.image_72?.trim() || undefined
  return { identifierValue, displayName, avatarUrl }
}

function logSlackLookup(method: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  console.log(`[slack] ${method} failed: ${message}`)
}

/** Channel rooms are external conversations. Direct messages omit the group. */
export function slackInboundGroup(input: {
  direct: boolean
  channelId: string
  name?: string
  participants: SlackPerson[]
}): { identifierValue: string; name?: string; participants: SlackPerson[] } | undefined {
  if (input.direct) return undefined
  return {
    identifierValue: input.channelId,
    name: input.name,
    participants: input.participants,
  }
}

function roomName(channel: SlackChannel | undefined, people: SlackPerson[]): string | undefined {
  const raw = channel?.name?.trim()
  if (channel?.is_mpim || (raw && raw.startsWith('mpdm-'))) {
    const names = people.map((person) => person.displayName).filter((name): name is string => !!name)
    if (names.length > 0) return names.join(', ')
  }
  if (!raw || raw.startsWith('mpdm-')) return undefined
  return raw
}

async function users(
  client: SlackClient,
  ids: string[],
  signal: AbortSignal,
): Promise<SlackPerson[]> {
  const people: SlackPerson[] = []
  const queue = [...ids]
  while (queue.length > 0) {
    if (signal.aborted) break
    const batch = queue.splice(0, 6)
    const resolved = await Promise.all(
      batch.map(async (user) => {
        try {
          const body = await client.api<{ user?: SlackUser }>('users.info', { user }, signal)
          return personFromUser(body.user)
        } catch {
          return { identifierValue: user } satisfies SlackPerson
        }
      }),
    )
    for (const person of resolved) {
      if (person) people.push(person)
    }
  }
  return people
}

/**
 * Channel name and the people Slack currently knows in the room.
 * Direct messages resolve the sender only. Lookup stops at the budget so the
 * Events ack can still store the message with the ids from the event.
 */
export async function describeSlackConversation(input: {
  botToken: string
  channelId: string
  senderId: string
  direct?: boolean
  budgetMs?: number
}): Promise<SlackRoomProfile> {
  const client = new SlackClient(input.botToken)
  const signal = AbortSignal.timeout(input.budgetMs ?? LOOKUP_BUDGET_MS)
  let channel: SlackChannel | undefined
  const senderLookup = users(client, [input.senderId], signal).catch(() => [] as SlackPerson[])

  if (!input.direct) {
    try {
      const info = await client.api<{ channel?: SlackChannel }>(
        'conversations.info',
        { channel: input.channelId },
        signal,
      )
      channel = info.channel
    } catch (error) {
      logSlackLookup('conversations.info', error)
      channel = undefined
    }
  }

  const memberIds: string[] = []
  if (!input.direct && !channel?.is_im) {
    let cursor: string | undefined
    do {
      if (signal.aborted || memberIds.length >= MEMBER_CAP) break
      try {
        const page = await client.api<{ members?: string[]; response_metadata?: { next_cursor?: string } }>(
          'conversations.members',
          {
            channel: input.channelId,
            limit: String(Math.min(200, MEMBER_CAP - memberIds.length)),
            ...(cursor ? { cursor } : {}),
          },
          signal,
        )
        for (const id of page.members ?? []) {
          if (!memberIds.includes(id) && memberIds.length < MEMBER_CAP) memberIds.push(id)
        }
        cursor = page.response_metadata?.next_cursor || undefined
      } catch (error) {
        logSlackLookup('conversations.members', error)
        cursor = undefined
      }
    } while (cursor)
  }

  const known = new Set<string>([input.senderId])
  const extraIds = memberIds.filter((id) => {
    if (known.has(id)) return false
    known.add(id)
    return true
  })
  const [senderPeople, otherPeople] = await Promise.all([
    senderLookup,
    extraIds.length > 0 ? users(client, extraIds, signal).catch(() => [] as SlackPerson[]) : Promise.resolve([]),
  ])

  const participants = [...senderPeople, ...otherPeople]
  if (!participants.some((person) => person.identifierValue === input.senderId)) {
    participants.unshift({ identifierValue: input.senderId })
  }

  return {
    name: input.direct ? undefined : roomName(channel, participants),
    participants,
  }
}

export function readInstallationEnv(
  appInstallationId: string,
): Promise<Record<string, string>> {
  return token.installationEnv(appInstallationId)
}
