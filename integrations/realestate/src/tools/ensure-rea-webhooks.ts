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
import { ensureInstallReaSubscriptions } from '../lib/ensure-rea-webhooks'
import type { ReaClientEnv, ReaWebhookSubscription } from '../lib/rea-types'

const EnsureReaWebhooksInputSchema = z.object({})

const ReaSubscriptionRowSchema = z.object({
  subscriptionId: z.string(),
  eventType: z.string(),
  eventCategory: z.string(),
  webhookUrl: z.string(),
  status: z.string().optional(),
  ownerId: z.string().optional(),
})

const EnsureReaWebhooksOutputSchema = z.object({
  enquiryWebhookUrl: z.string(),
  leadSubscriptionId: z.string(),
  leadAction: z.enum(['kept', 'created', 'retargeted']),
  leadPreviousUrl: z.string().optional(),
  before: z.array(ReaSubscriptionRowSchema),
  after: z.array(ReaSubscriptionRowSchema),
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

export const ensureReaWebhooksRegistry: ToolDefinition<
  EnsureReaWebhooksInput,
  EnsureReaWebhooksOutput
> = {
  name: 'ensure_rea_webhooks',
  label: 'Ensure REA webhooks',
  description:
    'List REA webhook subscriptions and point EnquiryCreated at this install URL.',
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
      const ensured = await ensureInstallReaSubscriptions(env)
      const after = toRows(await client.listWebhookSubscriptions())

      const message =
        ensured.leadAction === 'kept'
          ? `REA EnquiryCreated already points at ${ensured.enquiryWebhookUrl}.`
          : ensured.leadAction === 'retargeted'
            ? `Retargeted EnquiryCreated from ${ensured.leadPreviousUrl} to ${ensured.enquiryWebhookUrl}.`
            : `Created EnquiryCreated subscription at ${ensured.enquiryWebhookUrl}.`

      return createSuccessResponse({
        enquiryWebhookUrl: ensured.enquiryWebhookUrl,
        leadSubscriptionId: ensured.leadSubscriptionId,
        leadAction: ensured.leadAction,
        leadPreviousUrl: ensured.leadPreviousUrl,
        before,
        after,
        message,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('[REA] ensure_rea_webhooks failed:', error)
      return createExternalError('REA', message)
    }
  },
}
