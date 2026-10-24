import { instance, token, runWithConfig, getConfig, communicationChannel } from 'skedyul'
import type { OAuthCallbackContext, OAuthCallbackResult } from 'skedyul'
import { MetaClient } from '../../lib/meta_client'
import { phoneDigits, toE164Phone } from '../../lib/meta_webhook/phone_identifier'

/**
 * OAuth callback handler for the Meta app.
 *
 * Each installation supports one Meta account. Connection details are persisted
 * on the installation env (via the returned `env` object), not in a CRM table.
 */
export default async function oauthCallback(
  ctx: OAuthCallbackContext,
): Promise<OAuthCallbackResult> {
  const { request } = ctx
  const query = request.query

  if (query.error) {
    const errorDescription = query.error_description || query.error
    throw new Error(`OAuth error: ${errorDescription}`)
  }

  const code = query.code
  if (!code) {
    throw new Error('Missing authorization code in OAuth callback')
  }

  let appInstallationId: string | undefined
  let appHandle: string | undefined
  let appVersionHandle: string | undefined

  if (query.state) {
    try {
      const stateData = JSON.parse(
        Buffer.from(query.state, 'base64').toString('utf-8'),
      ) as {
        appInstallationId?: string
        app?: { handle?: string; versionHandle?: string }
      }
      appInstallationId = stateData.appInstallationId
      appHandle = stateData.app?.handle
      appVersionHandle = stateData.app?.versionHandle
    } catch {
      throw new Error('Invalid state parameter: failed to decode')
    }
  }

  if (!appInstallationId) {
    throw new Error('Missing appInstallationId in state parameter')
  }

  const META_APP_ID = process.env.META_APP_ID
  const META_APP_SECRET = process.env.META_APP_SECRET
  const GRAPH_API_VERSION = process.env.GRAPH_API_VERSION

  if (!META_APP_ID || !META_APP_SECRET) {
    throw new Error(
      "META_APP_ID and META_APP_SECRET must be configured. Make sure they are set in the app version's provision-level environment variables.",
    )
  }

  if (!GRAPH_API_VERSION) {
    throw new Error(
      "GRAPH_API_VERSION must be configured. Make sure it is set in the app version's provision-level environment variables.",
    )
  }

  ctx.log.info(`[Meta OAuth] Processing callback for installation ${appInstallationId}`)

  const { token: scopedToken } = await token.exchangeRaw(appInstallationId)
  const currentConfig = getConfig()

  const baseUrl = (process.env.SKEDYUL_API_URL || '').replace(/\/+$/, '')
  if (!appHandle || !appVersionHandle) {
    throw new Error('Missing app handle or version handle in state parameter')
  }
  const redirectUri = `${baseUrl}/api/callbacks/oauth/${appHandle}/${appVersionHandle}`

  const client = new MetaClient(META_APP_ID, META_APP_SECRET, GRAPH_API_VERSION)

  async function ensureChannel(
    handle: 'whatsapp' | 'instagram' | 'messenger',
    input: { name: string; identifierValue: string },
  ) {
    const identifierValue =
      handle === 'whatsapp' ? toE164Phone(input.identifierValue) : input.identifierValue
    const existing = await communicationChannel.list({
      filter: { handle },
      limit: 100,
    })
    const already = existing.some((channel) =>
      handle === 'whatsapp'
        ? phoneDigits(channel.identifierValue) === phoneDigits(identifierValue)
        : channel.identifierValue === identifierValue,
    )
    if (already) return
    try {
      await communicationChannel.create(handle, { name: input.name, identifierValue })
    } catch (err) {
      ctx.log.warn(`[Meta OAuth] Failed to create ${handle} channel`, err)
    }
  }

  try {
    const shortLivedToken = await client.exchangeCodeForToken(code, redirectUri)
    const longLivedToken = await client.exchangeForLongLivedToken(shortLivedToken)

    const wabasResponse = await client.getWABAs(longLivedToken)
    if (wabasResponse.data.length === 0) {
      throw new Error(
        'No WhatsApp Business Accounts were included in this Meta login. Choose the WhatsApp account when Meta asks. If you just uninstalled, remove Skedyul from Facebook Settings → Business Integrations and install again.',
      )
    }

    const waba = wabasResponse.data[0]
    ctx.log.info(`[Meta OAuth] Found WABA: ${waba.id} (${waba.name})`)

    const phoneNumbersResponse = await client.getPhoneNumbers(waba.id, longLivedToken)
    let pagesResponse: Awaited<ReturnType<MetaClient['getPages']>> = { data: [] }
    try {
      pagesResponse = await client.getPages(longLivedToken)
    } catch (err) {
      ctx.log.warn('[Meta OAuth] Failed to fetch Facebook pages:', err)
    }

    let instagramAccounts: Array<{
      id: string
      username: string
      name?: string
      profile_picture_url?: string
      pageId?: string
    }> = []

    try {
      const instagramResponse = await client.getInstagramAccounts(longLivedToken)
      instagramAccounts = instagramResponse.data
      ctx.log.info(`[Meta OAuth] Found ${instagramAccounts.length} Instagram accounts`)
    } catch (err) {
      ctx.log.warn('[Meta OAuth] Failed to fetch Instagram (may not have permissions):', err)
    }

    await runWithConfig(
      { ...currentConfig, apiToken: scopedToken },
      async () => {
        for (const page of pagesResponse.data) {
          const existingPages = await instance.list('facebook_page', {
            filter: { page_id: page.id },
            limit: 1,
          })
          const pageRecord = { page_id: page.id, name: page.name }
          const pageEnv = page.access_token
            ? { ACCESS_TOKEN: page.access_token }
            : undefined
          if (existingPages.data.length > 0) {
            const existing = existingPages.data[0] as { id: string }
            await instance.update('facebook_page', existing.id, pageRecord, { env: pageEnv })
          } else {
            await instance.create('facebook_page', pageRecord, { env: pageEnv })
          }

          await ensureChannel('messenger', {
            name: page.name || `Messenger ${page.id}`,
            identifierValue: page.id,
          })
        }

        for (const instagramData of instagramAccounts) {
          const record = {
            instagram_account_id: instagramData.id,
            username: instagramData.username,
            name: instagramData.name || null,
            profile_picture_url: instagramData.profile_picture_url || null,
            facebook_page_id: instagramData.pageId || null,
          }
          const existingAccounts = await instance.list('instagram_account', {
            filter: { instagram_account_id: instagramData.id },
            limit: 1,
          })

          if (existingAccounts.data.length > 0) {
            const existing = existingAccounts.data[0] as { id: string }
            await instance.update('instagram_account', existing.id, record)
          } else {
            await instance.create('instagram_account', record)
          }

          await ensureChannel('instagram', {
            name: instagramData.name || `@${instagramData.username}`,
            identifierValue: instagramData.id,
          })
        }

        for (const phoneData of phoneNumbersResponse.data) {
          const phone = toE164Phone(phoneData.display_phone_number)
          const record = {
            phone,
            phone_number_id: phoneData.id,
            display_name: phoneData.verified_name,
            quality_rating: phoneData.quality_rating,
          }
          const phoneEnv = { ACCESS_TOKEN: longLivedToken }
          const existingPhones = await instance.list('whatsapp_phone_number', {
            filter: { phone_number_id: phoneData.id },
            limit: 1,
          })

          if (existingPhones.data.length > 0) {
            const existing = existingPhones.data[0] as { id: string }
            await instance.update('whatsapp_phone_number', existing.id, record, {
              env: phoneEnv,
            })
          } else {
            await instance.create('whatsapp_phone_number', record, { env: phoneEnv })
          }

          await ensureChannel('whatsapp', {
            name: phoneData.verified_name || `WhatsApp ${phone}`,
            identifierValue: phone,
          })
        }
      },
    )

    ctx.log.info('[Meta OAuth] OAuth callback completed successfully')

    return {
      appInstallationId,
      env: {
        META_ACCESS_TOKEN: longLivedToken,
        META_WABA_ID: waba.id,
        META_BUSINESS_NAME: waba.name,
        META_CONNECTION_STATUS: 'connected',
      },
    }
  } catch (err) {
    ctx.log.error('[Meta OAuth] OAuth callback failed:', err)
    const errorMessage = err instanceof Error ? err.message : String(err ?? 'Unknown error')
    throw new Error(`Failed to complete OAuth: ${errorMessage}`)
  }
}
