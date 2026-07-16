export type MetaConnectionStatus = 'connected' | 'pending' | 'error'

export type MetaConnectionInfo = {
  business_name: string
  waba_id: string
  status: MetaConnectionStatus
  connected: boolean
}

type EnvRecord = Record<string, string | undefined>

export function getMetaConnectionFromEnv(env: EnvRecord): MetaConnectionInfo {
  const accessToken = env.META_ACCESS_TOKEN
  const status = (env.META_CONNECTION_STATUS as MetaConnectionStatus | undefined) ??
    (accessToken ? 'connected' : 'pending')

  return {
    business_name: env.META_BUSINESS_NAME ?? '',
    waba_id: env.META_WABA_ID ?? '',
    status,
    connected: status === 'connected' && !!accessToken,
  }
}

export function requireMetaAccessToken(env: EnvRecord): string {
  const token = env.META_ACCESS_TOKEN
  if (!token) {
    throw new Error('META_ACCESS_TOKEN is not configured. Please complete the OAuth flow.')
  }
  return token
}

export function requireMetaWabaId(env: EnvRecord): string {
  const wabaId = env.META_WABA_ID
  if (!wabaId) {
    throw new Error(
      'META_WABA_ID is not configured. Please reconnect your Meta account.',
    )
  }
  return wabaId
}
