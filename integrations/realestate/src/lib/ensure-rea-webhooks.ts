import { webhook } from 'skedyul'
import { ReaClient } from './rea-client'
import {
  ENQUIRY_CREATED_WEBHOOK_NAME,
  REA_INTEGRATION_CREATED_EVENT_TYPE,
  REA_INTEGRATION_DELETED_EVENT_TYPE,
  REA_INTEGRATION_EVENT_CATEGORY,
  REA_INTEGRATION_UPDATED_EVENT_TYPE,
  REA_INTEGRATION_WEBHOOK_NAME,
  REA_LEAD_EVENT_CATEGORY,
  REA_LEAD_EVENT_TYPE,
  type ReaClientEnv,
  type ReaSubscriptionSpec,
  type ReaWebhookSubscription,
} from './rea-types'
import { cacheSigningKeys } from './rea-webhook-signature'

export interface InstallReaWebhookRegistration {
  id: string
  url: string
  name: string
}

export async function ensureInstallReaWebhook(
  name: string,
): Promise<InstallReaWebhookRegistration> {
  const { webhooks } = await webhook.list({ name })
  const existing = webhooks[0]

  if (existing) {
    return { id: existing.id, url: existing.url, name }
  }

  const created = await webhook.create(name)
  return { id: created.id, url: created.url, name }
}

export type ReaSubscriptionEnsureAction = 'kept' | 'created' | 'retargeted'

export type ReaSubscriptionEnsureResult = {
  subscriptionId: string
  status?: string
  created: boolean
  action: ReaSubscriptionEnsureAction
  previousUrl?: string
}

export async function ensureReaAllOwnersSubscription(
  env: ReaClientEnv,
  webhookUrl: string,
  spec: ReaSubscriptionSpec,
): Promise<ReaSubscriptionEnsureResult> {
  const client = ReaClient.fromEnv(env)
  const subscriptions = await client.listWebhookSubscriptions()

  const existingMatchingUrl = client.findSubscription(subscriptions, {
    eventType: spec.eventType,
    eventCategory: spec.eventCategory,
    allOwners: true,
    webhookUrl,
  })

  if (existingMatchingUrl) {
    return {
      subscriptionId: existingMatchingUrl.subscriptionId,
      status: existingMatchingUrl.status,
      created: false,
      action: 'kept',
    }
  }

  const existingAllOwners = client.findSubscription(subscriptions, {
    eventType: spec.eventType,
    eventCategory: spec.eventCategory,
    allOwners: true,
  })

  if (existingAllOwners) {
    // Single-workplace partner: retarget the leftover all-owners sub
    // (often the July provision-level URL) onto this install's registration.
    await client.deleteWebhookSubscription(existingAllOwners.subscriptionId)
  }

  // Per-agency subs for the same event conflict with all-owners — remove them.
  const perAgencyConflicts = subscriptions.filter(
    (subscription) =>
      subscription.eventType === spec.eventType &&
      subscription.eventCategory === spec.eventCategory &&
      Boolean(subscription.ownerId),
  )

  for (const conflicting of perAgencyConflicts) {
    await client.deleteWebhookSubscription(conflicting.subscriptionId)
  }

  const created = await client.createWebhookSubscription({
    ...spec,
    webhookUrl,
  })

  return {
    subscriptionId: created.subscriptionId,
    status: created.status,
    created: true,
    action: existingAllOwners ? 'retargeted' : 'created',
    previousUrl: existingAllOwners?.webhookUrl,
  }
}

export type EnquiryCreatedEnsureResult = {
  enquiryWebhookUrl: string
  leadSubscriptionId: string
  leadAction: ReaSubscriptionEnsureAction
  leadPreviousUrl?: string
}

/** Install-page repair: EnquiryCreated / lead only. Does not create Integration*. */
export async function ensureInstallEnquiryCreatedSubscription(
  env: ReaClientEnv,
): Promise<EnquiryCreatedEnsureResult> {
  const enquiryRegistration = await ensureInstallReaWebhook(ENQUIRY_CREATED_WEBHOOK_NAME)
  const lead = await ensureReaAllOwnersSubscription(env, enquiryRegistration.url, {
    eventType: REA_LEAD_EVENT_TYPE,
    eventCategory: REA_LEAD_EVENT_CATEGORY,
  })

  return {
    enquiryWebhookUrl: enquiryRegistration.url,
    leadSubscriptionId: lead.subscriptionId,
    leadAction: lead.action,
    leadPreviousUrl: lead.previousUrl,
  }
}

export type ReaInstallSubscriptions = {
  leadSubscriptionId: string
  integrationCreatedSubscriptionId: string
  integrationUpdatedSubscriptionId: string
  integrationDeletedSubscriptionId: string
  enquiryWebhookUrl: string
  integrationWebhookUrl: string
  leadAction: ReaSubscriptionEnsureAction
  leadPreviousUrl?: string
}

export async function ensureInstallReaSubscriptions(
  env: ReaClientEnv,
): Promise<ReaInstallSubscriptions> {
  const enquiryRegistration = await ensureInstallReaWebhook(ENQUIRY_CREATED_WEBHOOK_NAME)
  const integrationRegistration = await ensureInstallReaWebhook(
    REA_INTEGRATION_WEBHOOK_NAME,
  )

  const lead = await ensureReaAllOwnersSubscription(env, enquiryRegistration.url, {
    eventType: REA_LEAD_EVENT_TYPE,
    eventCategory: REA_LEAD_EVENT_CATEGORY,
  })

  const integrationCreated = await ensureReaAllOwnersSubscription(
    env,
    integrationRegistration.url,
    {
      eventType: REA_INTEGRATION_CREATED_EVENT_TYPE,
      eventCategory: REA_INTEGRATION_EVENT_CATEGORY,
    },
  )

  const integrationUpdated = await ensureReaAllOwnersSubscription(
    env,
    integrationRegistration.url,
    {
      eventType: REA_INTEGRATION_UPDATED_EVENT_TYPE,
      eventCategory: REA_INTEGRATION_EVENT_CATEGORY,
    },
  )

  const integrationDeleted = await ensureReaAllOwnersSubscription(
    env,
    integrationRegistration.url,
    {
      eventType: REA_INTEGRATION_DELETED_EVENT_TYPE,
      eventCategory: REA_INTEGRATION_EVENT_CATEGORY,
    },
  )

  return {
    leadSubscriptionId: lead.subscriptionId,
    integrationCreatedSubscriptionId: integrationCreated.subscriptionId,
    integrationUpdatedSubscriptionId: integrationUpdated.subscriptionId,
    integrationDeletedSubscriptionId: integrationDeleted.subscriptionId,
    enquiryWebhookUrl: enquiryRegistration.url,
    integrationWebhookUrl: integrationRegistration.url,
    leadAction: lead.action,
    leadPreviousUrl: lead.previousUrl,
  }
}

/** @deprecated Legacy helper — prefer ensureReaAllOwnersSubscription */
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

export async function deleteStoredReaSubscriptions(
  env: ReaClientEnv,
): Promise<{ deleted: string[] }> {
  const client = ReaClient.fromEnv(env)
  const ids = [
    env.REA_LEAD_SUBSCRIPTION_ID,
    env.REA_INTEGRATION_CREATED_SUBSCRIPTION_ID,
    env.REA_INTEGRATION_UPDATED_SUBSCRIPTION_ID,
    env.REA_INTEGRATION_DELETED_SUBSCRIPTION_ID,
    // Legacy single-subscription env from v1.0 per-agency installs
    (env as { REA_SUBSCRIPTION_ID?: string }).REA_SUBSCRIPTION_ID,
  ]
    .map((id) => id?.trim())
    .filter((id): id is string => Boolean(id))

  const uniqueIds = [...new Set(ids)]
  const deleted: string[] = []

  for (const subscriptionId of uniqueIds) {
    await client.deleteWebhookSubscription(subscriptionId)
    deleted.push(subscriptionId)
  }

  return { deleted }
}

/** Remove leftover all-owners lead sub when migrating — only use if intentionally abandoning. */
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

export function collectSubscriptionIdsFromList(
  subscriptions: ReaWebhookSubscription[],
  webhookUrl: string,
): string[] {
  return subscriptions
    .filter((subscription) => subscription.webhookUrl === webhookUrl)
    .map((subscription) => subscription.subscriptionId)
}

export {
  ENQUIRY_CREATED_WEBHOOK_NAME,
  REA_INTEGRATION_WEBHOOK_NAME,
  REA_LEAD_EVENT_CATEGORY,
  REA_LEAD_EVENT_TYPE,
}
