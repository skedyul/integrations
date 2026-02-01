/**
 * Install Configuration
 * =====================
 *
 * Defines per-install environment variables and lifecycle hooks.
 * - env: Collected from user during install, passed at runtime (NOT baked into container)
 * - onInstall: Tool to verify credentials before completing installation
 * - onUninstall: Tool to clean up when uninstalled
 */

import type { InstallConfig } from 'skedyul'

const config: InstallConfig = {
  // ─────────────────────────────────────────────────────────────────────────
  // Per-Install Environment Variables
  // ─────────────────────────────────────────────────────────────────────────
  //
  // These are collected from the user during installation.
  // They are stored encrypted per-installation and passed at runtime.
  //
  env: {
    PETBOOQZ_BASE_URL: {
      label: 'Petbooqz API Base URL',
      required: true,
      visibility: 'visible',
      placeholder: 'http://example.com/petbooqz/ExternalAPI/yourpetpa/v1/',
      description: 'Base URL for the Petbooqz API endpoint',
    },
    PETBOOQZ_USERNAME: {
      label: 'API Username',
      required: true,
      visibility: 'encrypted',
      description: 'Username for Petbooqz API authentication',
    },
    PETBOOQZ_PASSWORD: {
      label: 'API Password',
      required: true,
      visibility: 'encrypted',
      description: 'Password for Petbooqz API authentication',
    },
    PETBOOQZ_API_KEY: {
      label: 'API Key',
      required: true,
      visibility: 'encrypted',
      description: 'API key provided by Petbooqz',
    },
    PETBOOQZ_CLIENT_PRACTICE: {
      label: 'Client Practice ID',
      required: false,
      visibility: 'visible',
      description: 'Optional client practice identifier for multi-practice setups',
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Lifecycle Hooks
  // ─────────────────────────────────────────────────────────────────────────

  /** Tool to invoke when app is installed - verifies credentials before completing */
  onInstall: 'verify_credentials',
}

export default config
