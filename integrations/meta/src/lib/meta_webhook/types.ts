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

export type MetaLeadgenChangeValue = {
  leadgen_id?: string
  form_id?: string
  page_id?: string
  ad_id?: string
  created_time?: number
}

export type MetaWebhookChange = {
  field?: string
  value?: MetaWhatsAppChangeValue & MetaLeadgenChangeValue
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
  /** Present when the provider includes a group subject on the message. */
  group_subject?: string
  subject?: string
  referral?: {
    source_id?: string
    ad_id?: string
    source_url?: string
  }
}

export type MetaWhatsAppStatus = {
  id?: string
  status?: string
  timestamp?: string
  recipient_id?: string
}

export type MetaMessengerEvent = {
  sender?: { id?: string; name?: string }
  recipient?: { id?: string }
  thread_id?: string
  thread?: { id?: string; name?: string }
  timestamp?: number
  message?: {
    mid?: string
    text?: string
    attachments?: Array<{
      type?: string
      payload?: { url?: string }
    }>
  }
  referral?: {
    source_id?: string
    ad_id?: string
    ads_context_data?: { ad_title?: string }
    source_url?: string
  }
}

export type ResolvedMetaChannel = {
  channelId: string
  channelIdentifier: string
}
