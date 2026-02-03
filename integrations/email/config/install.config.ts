/**
 * Install Configuration
 * =====================
 *
 * The Email app uses a direct install handler (src/install.ts) which
 * automatically creates the {subdomain}@skedyul.app email address.
 *
 * No user-provided environment variables are required.
 */

import type { InstallConfig } from 'skedyul'

const config: InstallConfig = {
  // No env vars needed - email address is auto-generated from workplace subdomain
}

export default config
