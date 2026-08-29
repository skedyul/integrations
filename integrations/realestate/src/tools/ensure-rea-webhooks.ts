/**
 * Ensure REA webhook subscriptions point at this install's registration.
 *
 * Existing v1 installs often reused a leftover all-owners REA subscription
 * on a provision-level URL. That URL has no appInstallationId, so Temporal
 * never shows workplace webhook activity.
 */

import {
  z,
  type ToolDefinition,
  createSuccessResponse,
  createValidationError,
  createExternalError,
} from 'skedyul'
import { ReaClient } from '../lib/rea-client'
import { ensureInstallEnquiryCreatedSubscription } from '../lib/ensure-rea-webhooks'
import type {
  ReaClientEnv,
  ReaWebhookDelivery,
  ReaWebhookSubscription,
} from '../lib/rea-types'

const EnsureReaWebhooksInputSchema = z.object({})

const ReaSubscriptionRowSchema = z.object({
  subscriptionId: z.string(),
  eventType: z.string(),
  eventCategory: z.string(),
  webhookUrl: z.string(),
  status: z.string().optional(),
  ownerId: z.string().optional(),
})

const ReaDeliveryRowSchema = z.object({
  attemptId: z.string(),
  deliveryId: z.string(),
  statusCode: z.number().optional(),
  outcome: z.string().optional(),
  createdAt: z.string(),
})

const EnsureReaWebhooksOutputSchema = z.object({
  enquiryWebhookUrl: z.string(),
  leadSubscriptionId: z.string(),
  leadAction: z.enum(['kept', 'created', 'retargeted']),
  leadPreviousUrl: z.string().optional(),
  before: z.array(ReaSubscriptionRowSchema),
  after: z.array(ReaSubscriptionRowSchema),
  deliveries: z.array(ReaDeliveryRowSchema),
  message: z.string(),
})

type EnsureReaWebhooksInput = z.infer<typeof EnsureReaWebhooksInputSchema>
type EnsureReaWebhooksOutput = z.infer<typeof EnsureReaWebhooksOutputSchema>

function toRows(subscriptions: ReaWebhookSubscription[]) {
  return subscriptions.map((subscription) => ({
    subscriptionId: subscription.subscriptionId,
    eventType: subscription.eventType,
    eventCategory: subscription.eventCategory,
    webhookUrl: subscription.webhookUrl,
    status: subscription.status,
    ownerId: subscription.ownerId,
  }))
}

function toDeliveryRows(deliveries: ReaWebhookDelivery[]) {
  return deliveries.slice(0, 10).map((delivery) => ({
    attemptId: delivery.attemptId,
    deliveryId: delivery.deliveryId,
    statusCode: delivery.statusCode,
    outcome: delivery.outcome,
    createdAt: delivery.createdAt,
  }))
}

function deliverySummary(deliveries: ReaWebhookDelivery[]): string {
  if (deliveries.length === 0) {
    return 'REA has no delivery attempts for this subscription yet — Temporal will stay empty until REA POSTs EnquiryCreated.'
  }

  const latest = deliveries[0]
  const when = latest.createdAt
  const outcome = latest.outcome ?? 'unknown'
  const status = latest.statusCode ?? 'n/a'
  return `Latest REA delivery: ${outcome} HTTP ${status} at ${when}.`
}

export const ensureReaWebhooksRegistry: ToolDefinition<
  EnsureReaWebhooksInput,
  EnsureReaWebhooksOutput
> = {
  name: 'ensure_rea_webhooks',
  label: 'Ensure REA webhooks',
  description:
    'List REA webhook subscriptions and point EnquiryCreated (lead only) at this install URL.',
  inputSchema: EnsureReaWebhooksInputSchema,
  outputSchema: EnsureReaWebhooksOutputSchema,
  handler: async (_input, context) => {
    const env = context.env as ReaClientEnv

    if (!env.REA_CLIENT_ID || !env.REA_CLIENT_SECRET) {
      return createValidationError(
        'REA partner credentials are not configured. Contact your administrator.',
      )
    }

    try {
      const client = ReaClient.fromEnv(env)
      const before = toRows(await client.listWebhookSubscriptions())
      const ensured = await ensureInstallEnquiryCreatedSubscription(env)
      const after = toRows(await client.listWebhookSubscriptions())
      const deliveries = toDeliveryRows(
        await client.listWebhookDeliveries(ensured.leadSubscriptionId),
      )

      const repairMessage =
        ensured.leadAction === 'kept'
          ? `REA EnquiryCreated already points at ${ensured.enquiryWebhookUrl}.`
          : ensured.leadAction === 'retargeted'
            ? `Retargeted EnquiryCreated from ${ensured.leadPreviousUrl} to ${ensured.enquiryWebhookUrl}.`
            : `Created EnquiryCreated subscription at ${ensured.enquiryWebhookUrl}.`
      const message = `${repairMessage} ${deliverySummary(deliveries)}`

      return createSuccessResponse({
        enquiryWebhookUrl: ensured.enquiryWebhookUrl,
        leadSubscriptionId: ensured.leadSubscriptionId,
        leadAction: ensured.leadAction,
        leadPreviousUrl: ensured.leadPreviousUrl,
        before,
        after,
        deliveries,
        message,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('[REA] ensure_rea_webhooks failed:', error)
      return createExternalError('REA', message)
    }
  },
}
