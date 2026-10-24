/**
 * Resolve the WhatsApp Business Accounts a Meta user token can access.
 *
 * A reconnect after uninstall often leaves the first Business Manager with no
 * owned accounts. The account the user just granted is on the token, on another
 * business, or shared (client) rather than owned.
 */

export class GraphPermissionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GraphPermissionError'
  }
}

export interface WabaRecord {
  id: string
  name: string
  timezone_id: string
  message_template_namespace?: string
}

export type ReadGraph = (url: string, errorLabel: string) => Promise<unknown>

const MAX_PAGES = 20

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isAuthInvalid(err: unknown): boolean {
  return err instanceof Error && err.name === 'AppAuthInvalidError'
}

export function readWaba(value: unknown): WabaRecord | null {
  if (!isRecord(value) || typeof value.id !== 'string' || value.id.length === 0) {
    return null
  }
  const record: WabaRecord = {
    id: value.id,
    name: typeof value.name === 'string' ? value.name : '',
    timezone_id: typeof value.timezone_id === 'string' ? value.timezone_id : '',
  }
  if (typeof value.message_template_namespace === 'string') {
    record.message_template_namespace = value.message_template_namespace
  }
  return record
}

/**
 * WABA ids the user granted this login. Meta lists the newest grant first on
 * `whatsapp_business_management`.
 */
export function grantedWabaIdsFromDebugToken(body: unknown): string[] {
  if (!isRecord(body)) return []
  const data = isRecord(body.data) ? body.data : body
  const scopes = data.granular_scopes
  if (!Array.isArray(scopes)) return []

  const ids: string[] = []
  const pushScope = (scopeName: string) => {
    for (const scope of scopes) {
      if (!isRecord(scope) || scope.scope !== scopeName) continue
      if (!Array.isArray(scope.target_ids)) continue
      for (const id of scope.target_ids) {
        if (typeof id === 'string' && id.length > 0 && !ids.includes(id)) {
          ids.push(id)
        }
      }
    }
  }

  pushScope('whatsapp_business_management')
  pushScope('whatsapp_business_messaging')
  return ids
}

export function mergeWabaRecords(
  grantedIds: string[],
  discovered: WabaRecord[],
): WabaRecord[] {
  const byId = new Map<string, WabaRecord>()
  const order: string[] = []

  const add = (waba: WabaRecord) => {
    const existing = byId.get(waba.id)
    if (!existing) {
      order.push(waba.id)
      byId.set(waba.id, { ...waba })
      return
    }
    if (!existing.name && waba.name) existing.name = waba.name
    if (!existing.timezone_id && waba.timezone_id) {
      existing.timezone_id = waba.timezone_id
    }
    if (!existing.message_template_namespace && waba.message_template_namespace) {
      existing.message_template_namespace = waba.message_template_namespace
    }
  }

  for (const id of grantedIds) {
    add({ id, name: '', timezone_id: '' })
  }
  for (const waba of discovered) {
    add(waba)
  }

  return order.map((id) => byId.get(id) as WabaRecord)
}

async function listPages<T>(
  readGraph: ReadGraph,
  firstUrl: string,
  errorLabel: string,
  mapItem: (value: unknown) => T | null,
): Promise<T[]> {
  const items: T[] = []
  let next: string | null = firstUrl
  const seen = new Set<string>()

  for (let page = 0; page < MAX_PAGES && next; page += 1) {
    if (seen.has(next)) break
    seen.add(next)
    const body = await readGraph(next, errorLabel)
    const data = isRecord(body) && Array.isArray(body.data) ? body.data : []
    for (const item of data) {
      const mapped = mapItem(item)
      if (mapped) items.push(mapped)
    }
    const paging = isRecord(body) && isRecord(body.paging) ? body.paging : undefined
    next = paging && typeof paging.next === 'string' ? paging.next : null
  }

  return items
}

async function listEdge(
  readGraph: ReadGraph,
  url: string,
  errorLabel: string,
): Promise<WabaRecord[]> {
  try {
    return await listPages(readGraph, url, errorLabel, readWaba)
  } catch (err) {
    if (err instanceof GraphPermissionError) return []
    throw err
  }
}

function withAccessToken(url: URL, accessToken: string): string {
  url.searchParams.set('access_token', accessToken)
  return url.toString()
}

export async function lookupWhatsAppBusinessAccounts(input: {
  baseUrl: string
  accessToken: string
  appAccessToken: string
  readGraph: ReadGraph
}): Promise<WabaRecord[]> {
  const { baseUrl, accessToken, appAccessToken, readGraph } = input

  let grantedIds: string[] = []
  try {
    const debugUrl = new URL(`${baseUrl}/debug_token`)
    debugUrl.searchParams.set('input_token', accessToken)
    debugUrl.searchParams.set('access_token', appAccessToken)
    const debugBody = await readGraph(
      debugUrl.toString(),
      'Failed to debug Meta token',
    )
    grantedIds = grantedWabaIdsFromDebugToken(debugBody)
  } catch (err) {
    if (isAuthInvalid(err)) throw err
  }

  let businesses: Array<{ id: string; name: string }> = []
  try {
    const businessesUrl = new URL(`${baseUrl}/me/businesses`)
    businesses = await listPages(
      readGraph,
      withAccessToken(businessesUrl, accessToken),
      'Failed to fetch businesses',
      (value) => {
        if (!isRecord(value) || typeof value.id !== 'string' || value.id.length === 0) {
          return null
        }
        return {
          id: value.id,
          name: typeof value.name === 'string' ? value.name : '',
        }
      },
    )
  } catch (err) {
    if (isAuthInvalid(err) || grantedIds.length === 0) throw err
  }

  if (businesses.length === 0 && grantedIds.length === 0) {
    throw new Error(
      'No businesses found. Please ensure the user has access to a Business Manager account.',
    )
  }

  const discovered: WabaRecord[] = []
  for (const business of businesses) {
    const ownedUrl = new URL(
      `${baseUrl}/${business.id}/owned_whatsapp_business_accounts`,
    )
    const clientUrl = new URL(
      `${baseUrl}/${business.id}/client_whatsapp_business_accounts`,
    )
    const owned = await listEdge(
      readGraph,
      withAccessToken(ownedUrl, accessToken),
      'Failed to fetch WABAs',
    )
    const shared = await listEdge(
      readGraph,
      withAccessToken(clientUrl, accessToken),
      'Failed to fetch shared WABAs',
    )
    discovered.push(...owned, ...shared)
  }

  const merged = mergeWabaRecords(grantedIds, discovered)
  const unreadable = new Set<string>()

  for (const waba of merged) {
    if (waba.name) continue
    try {
      const wabaUrl = new URL(`${baseUrl}/${waba.id}`)
      wabaUrl.searchParams.set(
        'fields',
        'id,name,timezone_id,message_template_namespace',
      )
      const body = await readGraph(
        withAccessToken(wabaUrl, accessToken),
        'Failed to fetch WhatsApp Business Account',
      )
      const hydrated = readWaba(body)
      if (!hydrated || hydrated.id !== waba.id) {
        unreadable.add(waba.id)
        continue
      }
      if (hydrated.name) waba.name = hydrated.name
      if (hydrated.timezone_id) waba.timezone_id = hydrated.timezone_id
      if (hydrated.message_template_namespace) {
        waba.message_template_namespace = hydrated.message_template_namespace
      }
    } catch (err) {
      if (isAuthInvalid(err)) throw err
      unreadable.add(waba.id)
    }
  }

  const readable = merged.filter((waba) => !unreadable.has(waba.id))
  return readable.length > 0 ? readable : merged
}
