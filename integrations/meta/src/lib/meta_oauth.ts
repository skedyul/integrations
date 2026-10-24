const META_OAUTH_SCOPES = [
  'business_management',
  'whatsapp_business_management',
  'whatsapp_business_messaging',
  'instagram_basic',
  'instagram_manage_messages',
  'pages_manage_metadata',
  'pages_messaging',
  'pages_read_engagement',
]

/**
 * Facebook Login URL for a Meta installation.
 *
 * `auth_type=rerequest` asks again for permissions the user removed when they
 * uninstalled. Without it, a reconnect can return a code that never includes
 * the WhatsApp account.
 */
export function buildMetaOAuthUrl(input: {
  appId: string
  graphApiVersion: string
  redirectUri: string
  state: string
}): string {
  const oauthUrl = new URL(
    `https://www.facebook.com/${input.graphApiVersion}/dialog/oauth`,
  )
  oauthUrl.searchParams.set('client_id', input.appId)
  oauthUrl.searchParams.set('redirect_uri', input.redirectUri)
  oauthUrl.searchParams.set('scope', META_OAUTH_SCOPES.join(','))
  oauthUrl.searchParams.set('state', input.state)
  oauthUrl.searchParams.set('response_type', 'code')
  oauthUrl.searchParams.set('auth_type', 'rerequest')
  return oauthUrl.toString()
}
