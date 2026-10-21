import type { ToolRegistry, WebhookRegistry } from 'skedyul'
import { sendSlackRegistry } from './tools/send_slack'
import { receiveSlackRegistry } from './webhooks/receive_slack'

export const toolRegistry: ToolRegistry = {
  send_slack: sendSlackRegistry,
}

export const webhookRegistry: WebhookRegistry = {
  receive_slack: receiveSlackRegistry,
}
