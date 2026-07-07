/**
 * Skedyul App Configuration
 * =========================
 *
 * This is the main configuration file for the Petbooqz app.
 * Resources are auto-discovered from the following locations:
 *
 *   models/        - Model definitions (scope declared in each model)
 *   agents/        - Agent definitions
 *   pages/         - Page definitions (file-based routing)
 *   env.ts         - Environment variables (with scope property)
 *   navigation.ts  - Base navigation configuration
 *   src/tools/     - Tool definitions
 *   src/server/    - Lifecycle hooks (install, provision, uninstall)
 */

import { defineConfig } from 'skedyul'
import pkg from './package.json' with { type: 'json' }
import { toolRegistry } from './src/registries'
import provisionConfig from './src/provision'

export default defineConfig({
  name: 'Petbooqz',
  version: pkg.version,
  description: 'Petbooqz veterinary practice management integration',
  computeLayer: 'serverless',

  tools: Promise.resolve({ toolRegistry }),

  provision: Promise.resolve({ default: provisionConfig }),

  /**
   * Rate-limit queues for Petbooqz API coordination.
   *
   * - petbooqz_api: one acquire per upstream HTTP call (enforced in api_client)
   * - petbooqz_calendar_booking: mutations serialized per calendar_id (correctness mutex)
   */
  queues: {
    petbooqz_api: {
      scope: 'install',
      maxConcurrent: 4,
      minTime: 100,
      reservoir: 30,
      reservoirRefreshAmount: 30,
      reservoirRefreshInterval: 60_000,
      // Wait up to 2 minutes for a slot; SDK retries acquire with backoff before surfacing RATE_LIMITED.
      timeout: 120_000,
      maxRetries: 5,
      retryDelayMs: 2000,
    },
    petbooqz_calendar_booking: {
      scope: 'install',
      maxConcurrent: 1,
      maxRetries: 0,
    },
  },
})
