import { webhook } from 'skedyul'
import { ReaClient } from './rea-client'
import {
  ENQUIRY_CREATED_WEBHOOK_NAME,
  REA_LEAD_EVENT_CATEGORY,
  REA_LEAD_EVENT_TYPE,
  type ReaClientEnv,
} from './rea-types'
import { cacheSigningKeys } from './rea-webhook-signature'

export interface InstallReaWebhookRegistration {
  id: string
  url: string
}

export async function ensureInstallReaWebhook(): Promise<InstallReaWebhookRegistration> {
  const { webhooks } = await webhook.list({ name: ENQUIRY_CREATED_WEBHOOK_NAME })
  const existing = webhooks[0]

  if (existing) {
    return { id: existing.id, url: existing.url }
  }

  const created = await webhook.create(ENQUIRY_CREATED_WEBHOOK_NAME)
  return { id: created.id, url: created.url }
}

export async function ensureReaAgencyLeadSubscription(
  env: ReaClientEnv,
  agencyId: string,
  webhookUrl: string,
): Promise<{ subscriptionId: string; status?: string }> {
  const client = ReaClient.fromEnv(env)
  const subscriptions = await client.listWebhookSubscriptions()

  const existing = client.findLeadSubscription(subscriptions, {
    ownerId: agencyId,
    webhookUrl,
  })

  if (existing) {
    return {
      subscriptionId: existing.subscriptionId,
      status: existing.status,
    }
  }

  const conflicting = client.findLeadSubscription(subscriptions, {
    ownerId: agencyId,
  })

  if (conflicting) {
    throw new Error(
      `REA subscription already exists for agency ${agencyId} with a different webhook URL. Delete subscription ${conflicting.subscriptionId} in REA before reinstalling.`,
    )
  }

  const created = await client.createLeadWebhookSubscription(webhookUrl, {
    ownerId: agencyId,
    ownerType: 'agency',
  })

  return {
    subscriptionId: created.subscriptionId,
    status: created.status,
  }
}

export async function removeAllAgenciesReaLeadSubscription(
  env: ReaClientEnv,
): Promise<{ deleted: boolean; subscriptionId?: string }> {
  const client = ReaClient.fromEnv(env)
  const subscriptions = await client.listWebhookSubscriptions()

  const existing = client.findLeadSubscription(subscriptions, { allOwners: true })

  if (!existing) {
    return { deleted: false }
  }

  await client.deleteWebhookSubscription(existing.subscriptionId)

  return {
    deleted: true,
    subscriptionId: existing.subscriptionId,
  }
}

export async function prefetchReaSigningKeys(env: ReaClientEnv): Promise<number> {
  const client = ReaClient.fromEnv(env)
  const response = await client.getSigningKeys()
  cacheSigningKeys(response.keys ?? [])
  return response.keys?.length ?? 0
}

export {
  ENQUIRY_CREATED_WEBHOOK_NAME,
  REA_LEAD_EVENT_CATEGORY,
  REA_LEAD_EVENT_TYPE,
}
