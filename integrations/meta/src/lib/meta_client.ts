/**
 * Meta Graph API Client
 * =====================
 *
 * Wrapper for Meta Graph API calls including:
 * - OAuth token exchange
 * - WhatsApp Business Account (WABA) operations
 * - Phone number management
 * - Message sending
 * - Facebook Pages and Instagram account fetching
 */

import { AppAuthInvalidError } from 'skedyul'

interface MetaErrorResponse {
  error?: {
    code?: number
    error_subcode?: number
    type?: string
    message?: string
  }
}

/**
 * Parse Meta API error response
 */
async function parseMetaError(response: Response): Promise<MetaErrorResponse> {
  try {
    const text = await response.text()
    return JSON.parse(text) as MetaErrorResponse
  } catch {
    return { error: { message: `HTTP ${response.status}: ${response.statusText}` } }
  }
}

/**
 * Check if an error response indicates token invalidation
 */
function isTokenInvalidError(errorResponse: MetaErrorResponse): boolean {
  const error = errorResponse.error
  if (!error) return false

  // Primary token error codes
  if (error.code === 190) return true // Invalid OAuth 2.0 Access Token
  if (error.code === 102) return true // Session key invalid/expired

  // Token expired subcode
  if (error.code === 190 && error.error_subcode === 463) return true

  // Permission denied can sometimes indicate token issues
  if (error.code === 10 && error.type === 'OAuthException') return true

  return false
}

interface TokenExchangeResponse {
  access_token: string
  token_type: string
  expires_in?: number
}

interface WABAResponse {
  data: Array<{
    id: string
    name: string
    timezone_id: string
    message_template_namespace?: string
  }>
}

interface PhoneNumberResponse {
  data: Array<{
    id: string
    display_phone_number: string
    verified_name: string
    quality_rating: 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN'
  }>
}

interface PageResponse {
  data: Array<{
    id: string
    name: string
    access_token?: string
  }>
}

interface InstagramAccountResponse {
  data: Array<{
    id: string
    username: string
    name?: string
    profile_picture_url?: string
  }>
}

interface SendMessageResponse {
  messaging_product: string
  contacts: Array<{
    input: string
    wa_id: string
  }>
  messages: Array<{
    id: string
  }>
}

export class MetaClient {
  private appId: string
  private appSecret: string
  private baseUrl: string

  constructor(appId: string, appSecret: string, apiVersion?: string) {
    this.appId = appId
    this.appSecret = appSecret
    // Use provided apiVersion, or fall back to process.env, or default to v24.0
    const version = apiVersion || process.env.GRAPH_API_VERSION || 'v24.0'
    this.baseUrl = `https://graph.facebook.com/${version}`
  }

  /**
   * Exchange authorization code for short-lived access token
   */
  async exchangeCodeForToken(
    code: string,
    redirectUri: string,
  ): Promise<string> {
    const url = new URL(`${this.baseUrl}/oauth/access_token`)
    url.searchParams.set('client_id', this.appId)
    url.searchParams.set('client_secret', this.appSecret)
    url.searchParams.set('redirect_uri', redirectUri)
    url.searchParams.set('code', code)

    const response = await fetch(url.toString(), {
      method: 'GET',
    })

    if (!response.ok) {
      const errorResponse = await parseMetaError(response)
      if (isTokenInvalidError(errorResponse)) {
        throw new AppAuthInvalidError(
          errorResponse.error?.message || 'Meta access token is invalid or expired',
        )
      }
      throw new Error(`Token exchange failed: ${JSON.stringify(errorResponse)}`)
    }

    const data = (await response.json()) as TokenExchangeResponse
    return data.access_token
  }

  /**
   * Exchange short-lived token for long-lived token (60 days)
   */
  async exchangeForLongLivedToken(shortLivedToken: string): Promise<string> {
    const url = new URL(`${this.baseUrl}/oauth/access_token`)
    url.searchParams.set('grant_type', 'fb_exchange_token')
    url.searchParams.set('client_id', this.appId)
    url.searchParams.set('client_secret', this.appSecret)
    url.searchParams.set('fb_exchange_token', shortLivedToken)

    const response = await fetch(url.toString(), {
      method: 'GET',
    })

    if (!response.ok) {
      const errorResponse = await parseMetaError(response)
      if (isTokenInvalidError(errorResponse)) {
        throw new AppAuthInvalidError(
          errorResponse.error?.message || 'Meta access token is invalid or expired',
        )
      }
      throw new Error(`Long-lived token exchange failed: ${JSON.stringify(errorResponse)}`)
    }

    const data = (await response.json()) as TokenExchangeResponse
    return data.access_token
  }

  /**
   * Get WhatsApp Business Accounts for the access token
   */
  async getWABAs(accessToken: string): Promise<WABAResponse> {
    const url = new URL(`${this.baseUrl}/me/owned_whatsapp_business_accounts`)
    url.searchParams.set('access_token', accessToken)

    const response = await fetch(url.toString(), {
      method: 'GET',
    })

    if (!response.ok) {
      const errorResponse = await parseMetaError(response)
      if (isTokenInvalidError(errorResponse)) {
        throw new AppAuthInvalidError(
          errorResponse.error?.message || 'Meta access token is invalid or expired',
        )
      }
      throw new Error(`Failed to fetch WABAs: ${JSON.stringify(errorResponse)}`)
    }

    return (await response.json()) as WABAResponse
  }

  /**
   * Get phone numbers for a WABA
   */
  async getPhoneNumbers(
    wabaId: string,
    accessToken: string,
  ): Promise<PhoneNumberResponse> {
    const url = new URL(`${this.baseUrl}/${wabaId}/phone_numbers`)
    url.searchParams.set('access_token', accessToken)

    const response = await fetch(url.toString(), {
      method: 'GET',
    })

    if (!response.ok) {
      const errorResponse = await parseMetaError(response)
      if (isTokenInvalidError(errorResponse)) {
        throw new AppAuthInvalidError(
          errorResponse.error?.message || 'Meta access token is invalid or expired',
        )
      }
      throw new Error(`Failed to fetch phone numbers: ${JSON.stringify(errorResponse)}`)
    }

    return (await response.json()) as PhoneNumberResponse
  }

  /**
   * Get connected Facebook Pages
   */
  async getPages(accessToken: string): Promise<PageResponse> {
    const url = new URL(`${this.baseUrl}/me/accounts`)
    url.searchParams.set('access_token', accessToken)
    url.searchParams.set('fields', 'id,name,access_token')

    const response = await fetch(url.toString(), {
      method: 'GET',
    })

    if (!response.ok) {
      const errorResponse = await parseMetaError(response)
      if (isTokenInvalidError(errorResponse)) {
        throw new AppAuthInvalidError(
          errorResponse.error?.message || 'Meta access token is invalid or expired',
        )
      }
      throw new Error(`Failed to fetch pages: ${JSON.stringify(errorResponse)}`)
    }

    return (await response.json()) as PageResponse
  }

  /**
   * Get connected Instagram accounts
   * Instagram accounts are linked to Facebook Pages, so we fetch pages first
   * then get the Instagram Business Account for each page.
   */
  async getInstagramAccounts(accessToken: string): Promise<InstagramAccountResponse> {
    // First, get all pages
    const pagesResponse = await this.getPages(accessToken)
    const instagramAccounts: Array<{ id: string; username: string; name?: string; profile_picture_url?: string }> = []

    // For each page, try to fetch its Instagram Business Account
    for (const page of pagesResponse.data) {
      try {
        const url = new URL(`${this.baseUrl}/${page.id}`)
        url.searchParams.set('access_token', accessToken)
        url.searchParams.set('fields', 'instagram_business_account{id,username,name,profile_picture_url}')

        const response = await fetch(url.toString(), {
          method: 'GET',
        })

        if (response.ok) {
          const pageData = (await response.json()) as {
            instagram_business_account?: {
              id: string
              username: string
              name?: string
              profile_picture_url?: string
            }
          }

          if (pageData.instagram_business_account) {
            instagramAccounts.push({
              id: pageData.instagram_business_account.id,
              username: pageData.instagram_business_account.username,
              name: pageData.instagram_business_account.name,
              profile_picture_url: pageData.instagram_business_account.profile_picture_url,
            })
          }
        } else {
          // Check for token errors even in nested calls
          const errorResponse = await parseMetaError(response)
          if (isTokenInvalidError(errorResponse)) {
            throw new AppAuthInvalidError(
              errorResponse.error?.message || 'Meta access token is invalid or expired',
            )
          }
        }
      } catch (err) {
        // Re-throw token errors
        if (err instanceof AppAuthInvalidError) {
          throw err
        }
        // Skip pages that don't have Instagram accounts or fail to fetch
        console.warn(`[MetaClient] Failed to fetch Instagram account for page ${page.id}:`, err)
      }
    }

    return { data: instagramAccounts }
  }

  /**
   * Send a WhatsApp message
   */
  async sendMessage(
    phoneNumberId: string,
    to: string,
    message: string,
    accessToken: string,
  ): Promise<SendMessageResponse> {
    const url = new URL(`${this.baseUrl}/${phoneNumberId}/messages`)
    url.searchParams.set('access_token', accessToken)

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: {
          body: message,
        },
      }),
    })

    if (!response.ok) {
      const errorResponse = await parseMetaError(response)
      if (isTokenInvalidError(errorResponse)) {
        throw new AppAuthInvalidError(
          errorResponse.error?.message || 'Meta access token is invalid or expired',
        )
      }
      throw new Error(`Failed to send message: ${JSON.stringify(errorResponse)}`)
    }

    return (await response.json()) as SendMessageResponse
  }
}
