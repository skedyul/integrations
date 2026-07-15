import type { ToolRegistry, WebhookRegistry } from 'skedyul'
import { pingRegistry } from './tools/ping'
import { enquiryCreatedWebhook } from './webhooks/enquiry-created'

export const toolRegistry: ToolRegistry = {
  ping: pingRegistry,
}

export const webhookRegistry: WebhookRegistry = {
  enquiry_created: enquiryCreatedWebhook,
}
