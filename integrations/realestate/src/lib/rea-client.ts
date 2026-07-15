import {
  normalizeReaApiBaseUrl,
  type ReaClientEnv,
  type ReaSigningKeysResponse,
  type ReaTokenResponse,
  type ReaWebhookSubscription,
  REA_REQUIRED_LEAD_SCOPE,
} from './rea-types'
import type { ReaEnquiryRecord, ReaIntegrationRecord } from '../events/types'

interface CachedToken {
  accessToken: string
  expiresAtMs: number
}

let cachedToken: CachedToken | null = null

export class ReaClient {
  private readonly clientId: string
  private readonly clientSecret: string
  private readonly baseUrl: string

  constructor(env: ReaClientEnv) {
    const clientId = env.REA_CLIENT_ID?.trim()
    const clientSecret = env.REA_CLIENT_SECRET?.trim()

    if (!clientId || !clientSecret) {
      throw new Error('REA_CLIENT_ID and REA_CLIENT_SECRET are required')
    }

    this.clientId = clientId
    this.clientSecret = clientSecret
    this.baseUrl = normalizeReaApiBaseUrl(env.REA_API_BASE_URL)
  }

  static fromEnv(env: ReaClientEnv): ReaClient {
    return new ReaClient(env)
  }

  async getAccessToken(): Promise<string> {
    const now = Date.now()
    if (cachedToken && cachedToken.expiresAtMs > now + 30_000) {
      return cachedToken.accessToken
    }

    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString(
      'base64',
    )

    const response = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(
        `REA token request failed (${response.status}): ${body.slice(0, 300)}`,
      )
    }

    const data = (await response.json()) as ReaTokenResponse
    if (!data.access_token) {
      throw new Error('REA token response missing access_token')
    }

    const expiresInMs = Math.max((data.expires_in ?? 3600) - 60, 60) * 1000
    cachedToken = {
      accessToken: data.access_token,
      expiresAtMs: now + expiresInMs,
    }

    return data.access_token
  }

  async getJson<T>(url: string): Promise<T> {
    const token = await this.getAccessToken()
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`REA GET ${url} failed (${response.status}): ${body.slice(0, 300)}`)
    }

    return (await response.json()) as T
  }

  async postJson<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const token = await this.getAccessToken()
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`REA POST ${path} failed (${response.status}): ${text.slice(0, 300)}`)
    }

    return (await response.json()) as T
  }

  async listIntegrations(): Promise<ReaIntegrationRecord[]> {
    const integrations: ReaIntegrationRecord[] = []
    let nextPage: string | null = null

    do {
      const path = nextPage
        ? `/me/v1/integrations?nextPage=${encodeURIComponent(nextPage)}`
        : '/me/v1/integrations'

      const data = await this.getJson<{
        _embedded?: { integrations?: ReaIntegrationRecord[] }
        _links?: { next?: { cursor?: string | null } | null }
      }>(`${this.baseUrl}${path}`)

      integrations.push(...(data._embedded?.integrations ?? []))
      nextPage = data._links?.next?.cursor ?? null
    } while (nextPage)

    return integrations
  }

  async findIntegrationForAgency(agencyId: string): Promise<ReaIntegrationRecord | null> {
    const integrations = await this.listLeadIntegrations()
    return (
      integrations.find((integration) => integration.ownerId === agencyId) ?? null
    )
  }

  async listLeadIntegrations(): Promise<ReaIntegrationRecord[]> {
    const integrations = await this.listIntegrations()
    return integrations.filter((integration) =>
      integration.scopes?.includes(REA_REQUIRED_LEAD_SCOPE),
    )
  }

  async listWebhookSubscriptions(): Promise<ReaWebhookSubscription[]> {
    const data = await this.getJson<{ subscriptions?: ReaWebhookSubscription[] }>(
      `${this.baseUrl}/webhooks/v1/subscriptions`,
    )
    return data.subscriptions ?? []
  }

  async createLeadWebhookSubscription(
    webhookUrl: string,
    owner?: { ownerId: string; ownerType: 'agency' },
  ): Promise<ReaWebhookSubscription> {
    const body: Record<string, unknown> = {
      eventType: 'EnquiryCreated',
      eventCategory: 'lead',
      webhookUrl,
    }

    if (owner) {
      body.ownerId = owner.ownerId
      body.ownerType = owner.ownerType
    }

    return this.postJson<ReaWebhookSubscription>('/webhooks/v1/subscriptions', body)
  }

  async deleteWebhookSubscription(subscriptionId: string): Promise<void> {
    const token = await this.getAccessToken()
    const response = await fetch(
      `${this.baseUrl}/webhooks/v1/subscriptions/${encodeURIComponent(subscriptionId)}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )

    if (!response.ok && response.status !== 404) {
      const text = await response.text()
      throw new Error(
        `REA DELETE subscription ${subscriptionId} failed (${response.status}): ${text.slice(0, 300)}`,
      )
    }
  }

  findLeadSubscription(
    subscriptions: ReaWebhookSubscription[],
    options: {
      webhookUrl?: string
      ownerId?: string
      allOwners?: boolean
    },
  ): ReaWebhookSubscription | undefined {
    return subscriptions.find((subscription) => {
      if (subscription.eventType !== 'EnquiryCreated') return false
      if (subscription.eventCategory !== 'lead') return false

      if (options.allOwners) {
        return !subscription.ownerId
      }

      if (options.ownerId && subscription.ownerId !== options.ownerId) {
        return false
      }

      if (options.webhookUrl && subscription.webhookUrl !== options.webhookUrl) {
        return false
      }

      return true
    })
  }

  async getSigningKeys(): Promise<ReaSigningKeysResponse> {
    return this.getJson<ReaSigningKeysResponse>(
      `${this.baseUrl}/webhooks/v1/signing`,
    )
  }

  async fetchEnquiry(resourceUrl: string): Promise<ReaEnquiryRecord> {
    return this.getJson<ReaEnquiryRecord>(resourceUrl)
  }
}

/** Reset cached token — for tests. */
export function resetReaClientTokenCache(): void {
  cachedToken = null
}
