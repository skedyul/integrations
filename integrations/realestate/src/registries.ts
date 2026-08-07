import type { ToolRegistry, WebhookRegistry } from 'skedyul'
import { pingRegistry } from './tools/ping'
import { checkIgniteIntegrationRegistry } from './tools/check-ignite-integration'
import { enquiryCreatedWebhook } from './webhooks/enquiry-created'
import { reaIntegrationWebhook } from './webhooks/integration-lifecycle'

export const toolRegistry: ToolRegistry = {
  ping: pingRegistry,
  check_ignite_integration: checkIgniteIntegrationRegistry,
}

export const webhookRegistry: WebhookRegistry = {
  enquiry_created: enquiryCreatedWebhook,
  rea_integration: reaIntegrationWebhook,
}
