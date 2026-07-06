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
import { toolRegistry } from './src/registries.ts'
import provisionConfig from './src/provision/index.ts'

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
      maxConcurrent: 2,
      minTime: 200,
      reservoir: 12,
      reservoirRefreshAmount: 12,
      reservoirRefreshInterval: 60_000,
      // Fail fast on acquire so MCP callers with long timeouts get RateLimitExceededError
      // (not a connection timeout when this matches the outer HTTP deadline).
      timeout: 10_000,
      maxRetries: 0,
    },
    petbooqz_calendar_booking: {
      scope: 'install',
      maxConcurrent: 1,
      maxRetries: 0,
    },
  },
})
