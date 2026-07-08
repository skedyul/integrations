/**
 * Skedyul App Configuration
 * =========================
 *
 * This is the main configuration file for the Phone app.
 * Resources are auto-discovered from the following locations:
 *
 *   models/        - Model definitions (scope declared in each model)
 *   channels/      - Channel definitions
 *   pages/         - Page definitions (file-based routing)
 *   workflows/     - Workflow definitions
 *   env.ts         - Environment variables (with scope property)
 *   navigation.ts  - Base navigation configuration
 *   src/tools/     - Tool definitions
 *   src/webhooks/  - Webhook handlers
 *   src/server/    - Lifecycle hooks (install, provision, uninstall)
 */

import { defineConfig } from 'skedyul'
import pkg from './package.json' with { type: 'json' }

export default defineConfig({
  name: 'Phone',
  version: pkg.version,
  description: 'SMS and voice communication via Twilio',
  computeLayer: 'serverless',
  build: {
    external: ['twilio'],
  },

  // Dynamic imports — static imports break skedyul build config loader in Docker (requires .ts as CJS)
  tools: import('./src/registries'),
  webhooks: import('./src/registries'),

  provision: import('./src/provision'),
})
