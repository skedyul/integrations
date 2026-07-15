import { webhook } from 'skedyul'
import { ReaClient } from './rea-client'
import {
  ENQUIRY_CREATED_WEBHOOK_NAME,
  REA_LEAD_EVENT_CATEGORY,
  REA_LEAD_EVENT_TYPE,
  type ReaClientEnv,
} from './rea-types'
import { cacheSigningKeys } from './rea-webhook-signature'

export interface ProvisionReaWebhookRegistration {
  id: string
  url: string
}

export async function ensureProvisionReaWebhook(): Promise<ProvisionReaWebhookRegistration> {
  const { webhooks } = await webhook.list({ name: ENQUIRY_CREATED_WEBHOOK_NAME })
  const existing = webhooks[0]

  if (existing) {
    return { id: existing.id, url: existing.url }
  }

  const created = await webhook.create(ENQUIRY_CREATED_WEBHOOK_NAME)
  return { id: created.id, url: created.url }
}

export async function ensureReaLeadSubscription(
  env: ReaClientEnv,
  webhookUrl: string,
): Promise<{ subscriptionId: string; status?: string }> {
  const client = ReaClient.fromEnv(env)
  const subscriptions = await client.listWebhookSubscriptions()

  const existing = subscriptions.find(
    (subscription) =>
      subscription.eventType === REA_LEAD_EVENT_TYPE &&
      subscription.eventCategory === REA_LEAD_EVENT_CATEGORY &&
      subscription.webhookUrl === webhookUrl &&
      !subscription.ownerId,
  )

  if (existing) {
    return {
      subscriptionId: existing.subscriptionId,
      status: existing.status,
    }
  }

  const created = await client.createLeadWebhookSubscription(webhookUrl)
  return {
    subscriptionId: created.subscriptionId,
    status: created.status,
  }
}

export async function prefetchReaSigningKeys(env: ReaClientEnv): Promise<number> {
  const client = ReaClient.fromEnv(env)
  const response = await client.getSigningKeys()
  cacheSigningKeys(response.keys ?? [])
  return response.keys?.length ?? 0
}
