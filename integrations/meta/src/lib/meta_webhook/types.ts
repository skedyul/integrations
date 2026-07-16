/**
 * Meta webhook payload types (subset used by handlers).
 */

export type MetaWebhookPayload = {
  object?: string
  entry?: MetaWebhookEntry[]
}

export type MetaWebhookEntry = {
  id?: string
  changes?: MetaWebhookChange[]
  messaging?: MetaMessengerEvent[]
  standby?: MetaMessengerEvent[]
}

export type MetaWebhookChange = {
  field?: string
  value?: MetaWhatsAppChangeValue
}

export type MetaWhatsAppChangeValue = {
  messaging_product?: string
  metadata?: {
    display_phone_number?: string
    phone_number_id?: string
  }
  contacts?: Array<{
    profile?: { name?: string }
    wa_id?: string
  }>
  messages?: MetaWhatsAppMessage[]
  statuses?: MetaWhatsAppStatus[]
}

export type MetaWhatsAppMessage = {
  from?: string
  id?: string
  timestamp?: string
  type?: string
  text?: { body?: string }
  image?: { id?: string; caption?: string }
  document?: { id?: string; filename?: string; caption?: string }
  audio?: { id?: string }
  video?: { id?: string; caption?: string }
  group_id?: string
}

export type MetaWhatsAppStatus = {
  id?: string
  status?: string
  timestamp?: string
  recipient_id?: string
}

export type MetaMessengerEvent = {
  sender?: { id?: string }
  recipient?: { id?: string }
  timestamp?: number
  message?: {
    mid?: string
    text?: string
    attachments?: Array<{
      type?: string
      payload?: { url?: string }
    }>
  }
}

export type ResolvedMetaChannel = {
  channelId: string
  channelIdentifier: string
}
