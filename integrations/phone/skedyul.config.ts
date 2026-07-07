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
import { toolRegistry, webhookRegistry } from './src/registries'
import provisionConfig from './src/provision'

export default defineConfig({
  name: 'Phone',
  version: pkg.version,
  description: 'SMS and voice communication via Twilio',
  computeLayer: 'serverless',
  build: {
    external: ['twilio'],
  },

  tools: Promise.resolve({ toolRegistry }),
  webhooks: Promise.resolve({ webhookRegistry }),

  provision: Promise.resolve({ default: provisionConfig }),
})
