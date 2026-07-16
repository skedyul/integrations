import { MetaClient } from './meta_client'

export const META_APP_WEBHOOK_SUBSCRIPTIONS = [
  {
    object: 'whatsapp_business_account',
    fields: ['messages', 'message_deliveries', 'message_reads'],
  },
  {
    object: 'page',
    fields: ['messages', 'messaging_postbacks', 'message_reads'],
  },
  {
    object: 'instagram',
    fields: ['messages'],
  },
] as const

export type MetaAppWebhookSubscription = (typeof META_APP_WEBHOOK_SUBSCRIPTIONS)[number]

export type MetaAppWebhookSubscriptionResult = {
  object: string
  status: 'configured' | 'skipped' | 'failed'
  message?: string
}

export type EnsureMetaAppWebhooksInput = {
  appId: string
  appSecret: string
  graphApiVersion?: string
  callbackUrl: string
  verifyToken: string
}

export type EnsureMetaAppWebhooksResult = {
  results: MetaAppWebhookSubscriptionResult[]
  manualSetupRequired: boolean
  dashboardUrl: string
}

function subscriptionCoversFields(
  subscribedFieldNames: string[],
  requiredFields: readonly string[],
): boolean {
  const subscribed = new Set(subscribedFieldNames)
  return requiredFields.every((field) => subscribed.has(field))
}

/**
 * Ensure Meta app-level webhook subscriptions point at the Skedyul callback URL.
 *
 * Uses the Graph API `/{app-id}/subscriptions` edge. Meta sends a GET verification
 * request to the callback URL during each POST, so this must run after
 * `webhook.create('receive_meta')`.
 */
export async function ensureMetaAppWebhooks(
  input: EnsureMetaAppWebhooksInput,
): Promise<EnsureMetaAppWebhooksResult> {
  const client = new MetaClient(input.appId, input.appSecret, input.graphApiVersion)
  const existing = await client.listAppSubscriptions()
  const results: MetaAppWebhookSubscriptionResult[] = []

  for (const subscription of META_APP_WEBHOOK_SUBSCRIPTIONS) {
    const current = existing.find((entry) => entry.object === subscription.object)

    if (
      current?.active &&
      current.callback_url === input.callbackUrl &&
      subscriptionCoversFields(
        current.fields.map((field) => field.name),
        subscription.fields,
      )
    ) {
      results.push({
        object: subscription.object,
        status: 'configured',
        message: 'Already subscribed with matching callback URL and fields',
      })
      continue
    }

    try {
      await client.upsertAppSubscription({
        object: subscription.object,
        callbackUrl: input.callbackUrl,
        verifyToken: input.verifyToken,
        fields: [...subscription.fields],
      })

      results.push({
        object: subscription.object,
        status: 'configured',
        message: current
          ? 'Updated app webhook subscription'
          : 'Created app webhook subscription',
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      results.push({
        object: subscription.object,
        status: 'failed',
        message,
      })
    }
  }

  const manualSetupRequired = results.some((result) => result.status === 'failed')

  return {
    results,
    manualSetupRequired,
    dashboardUrl: `https://developers.facebook.com/apps/${input.appId}/webhooks/`,
  }
}
