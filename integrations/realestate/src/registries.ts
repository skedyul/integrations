import type { ToolRegistry, WebhookRegistry } from 'skedyul'
import { pingRegistry } from './tools/ping'
import { checkIgniteIntegrationRegistry } from './tools/check-ignite-integration'
import { ensureReaWebhooksRegistry } from './tools/ensure-rea-webhooks'
import { enquiryCreatedWebhook } from './webhooks/enquiry-created'
import { reaIntegrationWebhook } from './webhooks/integration-lifecycle'

export const toolRegistry: ToolRegistry = {
  ping: pingRegistry,
  check_ignite_integration: checkIgniteIntegrationRegistry,
  ensure_rea_webhooks: ensureReaWebhooksRegistry,
}

export const webhookRegistry: WebhookRegistry = {
  enquiry_created: enquiryCreatedWebhook,
  rea_integration: reaIntegrationWebhook,
}
