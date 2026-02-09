/**
 * Install Configuration
 * =====================
 *
 * Defines per-install environment variables.
 * For Meta integration, OAuth provides the access token, so no per-install
 * env vars are needed during the initial install form.
 */

import type { InstallConfig } from 'skedyul'

const config: InstallConfig = {
  // ─────────────────────────────────────────────────────────────────────────
  // Per-Install Environment Variables
  // ─────────────────────────────────────────────────────────────────────────
  //
  // OAuth flow provides the access token, so no env vars needed here.
  // The install handler will redirect to Meta OAuth, and the oauth_callback
  // handler will store the token.
  //
  env: {},
}

export default config
