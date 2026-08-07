export const ENQUIRY_CREATED_WEBHOOK_NAME = 'enquiry_created' as const
export const REA_INTEGRATION_WEBHOOK_NAME = 'rea_integration' as const

export const REA_LEAD_EVENT_TYPE = 'EnquiryCreated' as const
export const REA_LEAD_EVENT_CATEGORY = 'lead' as const

export const REA_INTEGRATION_EVENT_CATEGORY = 'integration' as const
export const REA_INTEGRATION_CREATED_EVENT_TYPE = 'IntegrationCreated' as const
export const REA_INTEGRATION_UPDATED_EVENT_TYPE = 'IntegrationUpdated' as const
export const REA_INTEGRATION_DELETED_EVENT_TYPE = 'IntegrationDeleted' as const

export const REA_REQUIRED_LEAD_SCOPE = 'lead:enquiries:read' as const

export const REA_AGENCY_ID_PATTERN = /^[A-Z]{6}$/

export const IGNITE_INTEGRATIONS_URL =
  'https://ignite.realestate.com.au/manage/data-and-integrations'

export const CONNECT_AGENCIES_SETUP_STEP = 'connect_agencies' as const

export function normalizeReaApiBaseUrl(baseUrl?: string): string {
  const value = (baseUrl || 'https://api.realestate.com.au').replace(/\/+$/, '')
  return value
}

export interface ReaClientEnv {
  REA_CLIENT_ID?: string
  REA_CLIENT_SECRET?: string
  REA_API_BASE_URL?: string
  REA_LEAD_SUBSCRIPTION_ID?: string
  REA_INTEGRATION_CREATED_SUBSCRIPTION_ID?: string
  REA_INTEGRATION_UPDATED_SUBSCRIPTION_ID?: string
  REA_INTEGRATION_DELETED_SUBSCRIPTION_ID?: string
}

export interface ReaTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  scope?: string
}

export interface ReaWebhookSubscription {
  subscriptionId: string
  eventType: string
  eventCategory: string
  webhookUrl: string
  status?: string
  ownerId?: string
  ownerType?: string
}

export interface ReaSigningKey {
  kty: string
  use: string
  crv: string
  kid: string
  x: string
}

export interface ReaSigningKeysResponse {
  keys: ReaSigningKey[]
}

export type ReaSubscriptionSpec = {
  eventType: string
  eventCategory: string
}
