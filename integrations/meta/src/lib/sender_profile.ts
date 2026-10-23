/** name and profile_pic from a Graph user node. Empty fields are omitted. */
export function profileFromGraph(body: unknown): { name?: string; avatarUrl?: string } {
  if (!body || typeof body !== 'object') return {}
  const record = body as { name?: unknown; profile_pic?: unknown }
  const name = typeof record.name === 'string' ? record.name.trim() : ''
  const avatarUrl = typeof record.profile_pic === 'string' ? record.profile_pic.trim() : ''
  return {
    ...(name ? { name } : {}),
    ...(avatarUrl ? { avatarUrl } : {}),
  }
}
