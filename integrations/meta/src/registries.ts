/**
 * Tool & Webhook Registries
 */

import type { ToolRegistry, WebhookRegistry } from 'skedyul'

import { sendWhatsAppRegistry } from './tools/send_whatsapp'
import { sendMessengerRegistry } from './tools/send_messenger'
import { sendInstagramRegistry } from './tools/send_instagram'
import { fetchRegisteredWABusinessNumbersRegistry } from './tools/fetch_registered_wa_business_numbers'
import { addWhatsAppNumberRegistry } from './tools/add_whatsapp_number'
import { addFacebookPageRegistry } from './tools/add_facebook_page'
import { addInstagramAccountRegistry } from './tools/add_instagram_account'

export const toolRegistry: ToolRegistry = {
  send_whatsapp: sendWhatsAppRegistry,
  send_messenger: sendMessengerRegistry,
  send_instagram: sendInstagramRegistry,
  fetch_registered_wa_business_numbers: fetchRegisteredWABusinessNumbersRegistry,
  add_whatsapp_number: addWhatsAppNumberRegistry,
  add_facebook_page: addFacebookPageRegistry,
  add_instagram_account: addInstagramAccountRegistry,
}

import { receiveMetaRegistry } from './webhooks/receive_meta'

export const webhookRegistry: WebhookRegistry = {
  receive_meta: receiveMetaRegistry,
}
