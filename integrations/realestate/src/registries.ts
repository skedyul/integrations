import type { ToolRegistry, WebhookRegistry } from 'skedyul'
import { enquiryCreatedWebhook } from './webhooks/enquiry-created'

export const toolRegistry: ToolRegistry = {}

export const webhookRegistry: WebhookRegistry = {
  enquiry_created: enquiryCreatedWebhook,
}
