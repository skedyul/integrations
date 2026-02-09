import type { InstallHandlerContext, InstallHandlerResult } from 'skedyul'

/**
 * Install handler for the Meta app.
 * Called when a user clicks "Install" after providing preInstall env variables.
 * 
 * This handler:
 * 1. Constructs the Meta OAuth URL with all required scopes (WhatsApp, Instagram, Messenger)
 * 2. Encodes the state parameter with installation context
 * 3. Returns redirect URL to trigger OAuth flow
 */
export default async function install(ctx: InstallHandlerContext): Promise<InstallHandlerResult> {
  const { META_APP_ID } = ctx.env

  if (!META_APP_ID) {
    throw new Error('META_APP_ID is required but not provided')
  }

  console.log(`[Meta Install] Installing for workplace ${ctx.workplace.subdomain}`)
  console.log(`[Meta Install] Meta App ID: ${META_APP_ID?.slice(0, 4)}...`)

  // Construct OAuth redirect URI
  // This will be the oauth_callback endpoint on the Skedyul platform
  // The platform will route to our app's oauth_callback hook
  const baseUrl = process.env.SKEDYUL_API_URL || ''
  const redirectUri = `${baseUrl}/apps/${ctx.app.id}/versions/${ctx.app.versionId}/oauth_callback`

  // Encode state parameter with installation context
  // This will be decoded in the oauth_callback handler
  const stateData = {
    appInstallationId: ctx.appInstallationId,
    workplace: ctx.workplace,
    app: ctx.app,
  }
  const state = Buffer.from(JSON.stringify(stateData)).toString('base64')

  // Construct Meta OAuth URL with all scopes upfront
  // This requests permissions for WhatsApp, Instagram, and Messenger in one go
  const scopes = [
    // WhatsApp scopes
    'whatsapp_business_management',
    'whatsapp_business_messaging',
    // Instagram scopes
    'instagram_basic',
    'instagram_manage_messages',
    'pages_manage_metadata',
    // Messenger scopes
    'pages_messaging',
    'pages_read_engagement',
  ].join(',')

  const oauthUrl = new URL('https://www.facebook.com/v21.0/dialog/oauth')
  oauthUrl.searchParams.set('client_id', META_APP_ID)
  oauthUrl.searchParams.set('redirect_uri', redirectUri)
  oauthUrl.searchParams.set('scope', scopes)
  oauthUrl.searchParams.set('state', state)
  oauthUrl.searchParams.set('response_type', 'code')

  console.log(`[Meta Install] Redirecting to Meta OAuth: ${oauthUrl.toString().replace(/state=[^&]+/, 'state=***')}`)

  return {
    redirect: oauthUrl.toString(),
  }
}
