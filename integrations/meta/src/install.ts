import type { InstallHandlerContext, InstallHandlerResponseOAuth } from 'skedyul'

/**
 * Install handler for the Meta app.
 * Called when a user clicks "Install" after providing preInstall env variables.
 * 
 * This handler:
 * 1. Constructs the Meta OAuth URL with all required scopes (WhatsApp, Instagram, Messenger)
 * 2. Encodes the state parameter with installation context
 * 3. Returns redirect URL to trigger OAuth flow
 * 
 * Since this app has an oauth_callback hook, redirect is REQUIRED.
 */
export default async function install(ctx: InstallHandlerContext): Promise<InstallHandlerResponseOAuth> {
  // Provision-level env vars are baked into the container at provisioning time
  // Check process.env as fallback if not in ctx.env
  console.log('[Meta Install] Checking env vars...')
  console.log('[Meta Install] ctx.env keys:', Object.keys(ctx.env))
  console.log('[Meta Install] ctx.env.META_APP_ID:', ctx.env.META_APP_ID ? 'present' : 'missing')
  console.log('[Meta Install] process.env.META_APP_ID:', process.env.META_APP_ID ? 'present' : 'missing')
  console.log('[Meta Install] process.env keys (sample):', Object.keys(process.env).slice(0, 10))
  
  const META_APP_ID = ctx.env.META_APP_ID || process.env.META_APP_ID
  const META_APP_SECRET = ctx.env.META_APP_SECRET || process.env.META_APP_SECRET
  const GRAPH_API_VERSION = ctx.env.GRAPH_API_VERSION || process.env.GRAPH_API_VERSION

  if (!META_APP_ID) {
    console.error('[Meta Install] META_APP_ID not found in ctx.env or process.env')
    console.error('[Meta Install] Available process.env keys:', Object.keys(process.env).filter(k => k.includes('META')))
    throw new Error('META_APP_ID is required but not provided. Make sure it is set in the app version\'s provision-level environment variables.')
  }

  if (!META_APP_SECRET) {
    console.error('[Meta Install] META_APP_SECRET not found in ctx.env or process.env')
    throw new Error('META_APP_SECRET is required but not provided. Make sure it is set in the app version\'s provision-level environment variables.')
  }

  if (!GRAPH_API_VERSION) {
    console.error('[Meta Install] GRAPH_API_VERSION not found in ctx.env or process.env')
    throw new Error('GRAPH_API_VERSION is required but not provided. Make sure it is set in the app version\'s provision-level environment variables.')
  }

  console.log(`[Meta Install] Installing for workplace ${ctx.workplace.subdomain}`)
  console.log(`[Meta Install] Meta App ID: ${META_APP_ID?.slice(0, 4)}...`)

  // Construct OAuth redirect URI
  // Stable format: /api/callbacks/oauth/<app-handle>/<app-version-handle>
  // This works even if the app is reprovisioned, as handles are stable
  // The platform will route to our app's oauth_callback hook
  // Use ctx.env.SKEDYUL_API_URL (passed from workflow, derived from NGROK_DEVELOPER_URL if available)
  // Fall back to process.env for backward compatibility
  const baseUrl = ctx.env.SKEDYUL_API_URL || process.env.SKEDYUL_API_URL || ''
  const redirectUri = `${baseUrl}/api/callbacks/oauth/${ctx.app.handle}/${ctx.app.versionHandle}`

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

  const oauthUrl = new URL(`https://www.facebook.com/${GRAPH_API_VERSION}/dialog/oauth`)
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
