/**
 * Install Configuration
 * =====================
 *
 * Defines per-install environment variables.
 * - env: Collected from user during install, passed at runtime (NOT baked into container)
 *
 * Note: The install.ts handler validates credentials and normalizes the base URL.
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
      label: 'Petbooqz Server URL',
      required: true,
      visibility: 'visible',
      placeholder: '60.240.27.225:36680',
      description:
        'Server address for Petbooqz (e.g., 60.240.27.225:36680 or http://your-server.com)',
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
      required: true,
      visibility: 'visible',
      description: 'Optional client practice identifier for multi-practice setups',
    },
  },

  // Note: Credential verification and URL normalization is handled by install.ts
}

export default config
