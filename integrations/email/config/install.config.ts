/**
 * Install Configuration
 * =====================
 *
 * Defines tool names to invoke for install/uninstall lifecycle.
 * These tools are defined in src/registries.ts and can be invoked by agents.
 */

import type { InstallConfig } from 'skedyul'

const config: InstallConfig = {
  /** Tool to invoke when app is installed - creates {subdomain}@skedyul.app */
  onInstall: 'install',
  /** Tool to invoke when app is uninstalled - removes the email address */
  onUninstall: 'uninstall',
}

export default config
