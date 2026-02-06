/**
 * Install Configuration
 * =====================
 *
 * Defines per-install environment variables.
 * - env: Collected from user during install, passed at runtime (NOT baked into container)
 *
 * Note: The install.ts handler parses the club name from the URL.
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
    BFT_URL: {
      label: 'BFT Club URL',
      required: true,
      visibility: 'visible',
      placeholder: 'https://www.bodyfittraining.au/club/braybrook',
      description:
        'Full URL to the BFT club page (e.g., https://www.bodyfittraining.au/club/braybrook)',
    },
  },
}

export default config
