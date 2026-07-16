/**
 * Tool & Webhook Registries
 */

import type { ToolRegistry, WebhookRegistry } from 'skedyul'

import { sendWhatsAppRegistry } from './tools/send_whatsapp'
import { sendMessengerRegistry } from './tools/send_messenger'
import { sendInstagramRegistry } from './tools/send_instagram'
import { fetchRegisteredWABusinessNumbersRegistry } from './tools/fetch_registered_wa_business_numbers'
import { fetchMetaConnectionRegistry } from './tools/fetch_meta_connection'
import { addWhatsAppNumberRegistry } from './tools/add_whatsapp_number'
import { addFacebookPageRegistry } from './tools/add_facebook_page'
import { addInstagramAccountRegistry } from './tools/add_instagram_account'
import { removeWhatsAppNumberRegistry } from './tools/remove_whatsapp_number'
import { removeFacebookPageRegistry } from './tools/remove_facebook_page'
import { removeInstagramAccountRegistry } from './tools/remove_instagram_account'

export const toolRegistry: ToolRegistry = {
  send_whatsapp: sendWhatsAppRegistry,
  send_messenger: sendMessengerRegistry,
  send_instagram: sendInstagramRegistry,
  fetch_registered_wa_business_numbers: fetchRegisteredWABusinessNumbersRegistry,
  fetch_meta_connection: fetchMetaConnectionRegistry,
  add_whatsapp_number: addWhatsAppNumberRegistry,
  add_facebook_page: addFacebookPageRegistry,
  add_instagram_account: addInstagramAccountRegistry,
  remove_whatsapp_number: removeWhatsAppNumberRegistry,
  remove_facebook_page: removeFacebookPageRegistry,
  remove_instagram_account: removeInstagramAccountRegistry,
}

import { receiveMetaRegistry } from './webhooks/receive_meta'

export const webhookRegistry: WebhookRegistry = {
  receive_meta: receiveMetaRegistry,
}
