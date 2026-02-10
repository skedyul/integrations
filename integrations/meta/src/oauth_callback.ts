import { instance } from 'skedyul'
import type { OAuthCallbackContext, OAuthCallbackResult } from 'skedyul'
import { MetaClient } from './lib/meta_client'

/**
 * OAuth callback handler for the Meta app.
 * Called when Meta redirects back after user authorization.
 * 
 * This handler:
 * 1. Extracts authorization code from query params
 * 2. Exchanges code for short-lived token
 * 3. Exchanges short-lived token for long-lived token (60 days)
 * 4. Fetches WABA details and phone numbers
 * 5. Fetches connected Facebook Pages and Instagram accounts
 * 6. Creates meta_connection instance
 * 7. Creates separate facebook_page, instagram_account, and whatsapp_phone_number instances
 * 8. Returns access token to be stored as env var
 */
export default async function oauthCallback(
  ctx: OAuthCallbackContext,
): Promise<OAuthCallbackResult> {
  const { query, env, appInstallationId } = ctx

  // Check for OAuth error
  if (query.error) {
    const errorDescription = query.error_description || query.error
    throw new Error(`OAuth error: ${errorDescription}`)
  }

  const code = query.code
  if (!code) {
    throw new Error('Missing authorization code in OAuth callback')
  }

  // Provision-level env vars are baked into the container at provisioning time
  // Check process.env as fallback if not in env
  const META_APP_ID = env.META_APP_ID || process.env.META_APP_ID
  const META_APP_SECRET = env.META_APP_SECRET || process.env.META_APP_SECRET

  if (!META_APP_ID || !META_APP_SECRET) {
    throw new Error('META_APP_ID and META_APP_SECRET must be configured. Make sure they are set in the app version\'s provision-level environment variables.')
  }

  console.log(`[Meta OAuth] Processing callback for installation ${appInstallationId}`)

  // Construct redirect URI (must match the one used in install.ts)
  // Stable format: /api/callbacks/oauth/<app-handle>/<app-version-handle>
  // This works even if the app is reprovisioned, as handles are stable
  // Use ctx.env.SKEDYUL_API_URL (passed from workflow, derived from NGROK_DEVELOPER_URL if available)
  // Fall back to process.env for backward compatibility (baked into container at provisioning time)
  const baseUrl = ctx.env.SKEDYUL_API_URL || process.env.SKEDYUL_API_URL || ''
  const redirectUri = `${baseUrl}/api/callbacks/oauth/${ctx.app.handle}/${ctx.app.versionHandle}`

  // Initialize Meta client
  const client = new MetaClient(META_APP_ID, META_APP_SECRET)

  try {
    // Step 1: Exchange code for short-lived token
    console.log('[Meta OAuth] Exchanging code for short-lived token...')
    const shortLivedToken = await client.exchangeCodeForToken(code, redirectUri)

    // Step 2: Exchange for long-lived token (60 days)
    console.log('[Meta OAuth] Exchanging for long-lived token...')
    const longLivedToken = await client.exchangeForLongLivedToken(shortLivedToken)

    // Step 3: Fetch WABA details
    console.log('[Meta OAuth] Fetching WABA details...')
    const wabasResponse = await client.getWABAs(longLivedToken)

    if (wabasResponse.data.length === 0) {
      throw new Error('No WhatsApp Business Accounts found. Please ensure your Meta app has a WABA configured.')
    }

    const waba = wabasResponse.data[0]
    console.log(`[Meta OAuth] Found WABA: ${waba.id} (${waba.name})`)

    // Step 4: Fetch phone numbers
    console.log('[Meta OAuth] Fetching phone numbers...')
    const phoneNumbersResponse = await client.getPhoneNumbers(waba.id, longLivedToken)

    // Step 5: Fetch Facebook Pages and Instagram accounts (for future use)
    console.log('[Meta OAuth] Fetching Facebook Pages and Instagram accounts...')
    let pages: Array<{ id: string; name: string; access_token?: string }> = []
    let instagramAccounts: Array<{ id: string; username: string; name?: string; profile_picture_url?: string }> = []

    try {
      const pagesResponse = await client.getPages(longLivedToken)
      pages = pagesResponse.data
      console.log(`[Meta OAuth] Found ${pages.length} Facebook Pages`)

      const instagramResponse = await client.getInstagramAccounts(longLivedToken)
      instagramAccounts = instagramResponse.data
      console.log(`[Meta OAuth] Found ${instagramAccounts.length} Instagram accounts`)
    } catch (err) {
      console.warn('[Meta OAuth] Failed to fetch Pages/Instagram (may not have permissions):', err)
      // Continue without Pages/Instagram - they're optional
    }

    // Step 6: Create or update meta_connection instance
    console.log('[Meta OAuth] Creating meta_connection instance...')
    const existingConnections = await instance.list('meta_connection', {
      filter: { waba_id: waba.id },
      limit: 1,
    })

    let metaConnectionId: string
    if (existingConnections.data.length > 0) {
      // Update existing connection
      const existing = existingConnections.data[0] as { id: string }
      metaConnectionId = existing.id
      await instance.update('meta_connection', metaConnectionId, {
        business_name: waba.name,
        waba_id: waba.id,
        status: 'CONNECTED',
      })
      console.log(`[Meta OAuth] Updated existing meta_connection: ${metaConnectionId}`)
    } else {
      // Create new connection
      const created = await instance.create('meta_connection', {
        business_name: waba.name,
        waba_id: waba.id,
        status: 'CONNECTED',
      })
      metaConnectionId = created.id
      console.log(`[Meta OAuth] Created new meta_connection: ${metaConnectionId}`)
    }

    // Step 7: Create or update facebook_page instances
    console.log(`[Meta OAuth] Processing ${pages.length} Facebook Pages...`)
    for (const pageData of pages) {
      const existingPages = await instance.list('facebook_page', {
        filter: { page_id: pageData.id },
        limit: 1,
      })

      if (existingPages.data.length > 0) {
        // Update existing
        const existing = existingPages.data[0] as { id: string }
        await instance.update('facebook_page', existing.id, {
          page_id: pageData.id,
          name: pageData.name,
          access_token: pageData.access_token || null,
          meta_connection: metaConnectionId,
        })
      } else {
        // Create new
        await instance.create('facebook_page', {
          page_id: pageData.id,
          name: pageData.name,
          access_token: pageData.access_token || null,
          meta_connection: metaConnectionId,
        })
      }
    }

    // Step 8: Create or update instagram_account instances
    console.log(`[Meta OAuth] Processing ${instagramAccounts.length} Instagram accounts...`)
    for (const instagramData of instagramAccounts) {
      const existingAccounts = await instance.list('instagram_account', {
        filter: { instagram_account_id: instagramData.id },
        limit: 1,
      })

      if (existingAccounts.data.length > 0) {
        // Update existing
        const existing = existingAccounts.data[0] as { id: string }
        await instance.update('instagram_account', existing.id, {
          instagram_account_id: instagramData.id,
          username: instagramData.username,
          name: instagramData.name || null,
          profile_picture_url: instagramData.profile_picture_url || null,
          meta_connection: metaConnectionId,
        })
      } else {
        // Create new
        await instance.create('instagram_account', {
          instagram_account_id: instagramData.id,
          username: instagramData.username,
          name: instagramData.name || null,
          profile_picture_url: instagramData.profile_picture_url || null,
          meta_connection: metaConnectionId,
        })
      }
    }

    // Step 9: Create or update whatsapp_phone_number instances
    console.log(`[Meta OAuth] Processing ${phoneNumbersResponse.data.length} phone numbers...`)
    for (const phoneData of phoneNumbersResponse.data) {
      const existingPhones = await instance.list('whatsapp_phone_number', {
        filter: { phone_number_id: phoneData.id },
        limit: 1,
      })

      if (existingPhones.data.length > 0) {
        // Update existing
        const existing = existingPhones.data[0] as { id: string }
        await instance.update('whatsapp_phone_number', existing.id, {
          phone: phoneData.display_phone_number,
          phone_number_id: phoneData.id,
          display_name: phoneData.verified_name,
          quality_rating: phoneData.quality_rating,
          meta_connection: metaConnectionId,
        })
      } else {
        // Create new
        await instance.create('whatsapp_phone_number', {
          phone: phoneData.display_phone_number,
          phone_number_id: phoneData.id,
          display_name: phoneData.verified_name,
          quality_rating: phoneData.quality_rating,
          meta_connection: metaConnectionId,
        })
      }
    }

    console.log('[Meta OAuth] OAuth callback completed successfully')

    // Return token to be stored as env var
    return {
      env: {
        META_ACCESS_TOKEN: longLivedToken,
      },
      html: `
        <html>
          <body style="font-family: system-ui; padding: 40px; text-align: center;">
            <h1 style="color: #38a169;">✓ Meta Authorization Successful</h1>
            <p>Your Meta account has been connected successfully.</p>
            <p>Found ${phoneNumbersResponse.data.length} WhatsApp phone number(s), ${pages.length} Facebook Page(s), and ${instagramAccounts.length} Instagram account(s).</p>
            <p>You can close this window and return to the app.</p>
          </body>
        </html>
      `,
    }
  } catch (err) {
    console.error('[Meta OAuth] OAuth callback failed:', err)
    const errorMessage = err instanceof Error ? err.message : String(err ?? 'Unknown error')
    throw new Error(`Failed to complete OAuth: ${errorMessage}`)
  }
}
