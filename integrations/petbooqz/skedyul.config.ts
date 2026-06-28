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

export default defineConfig({
  name: 'Petbooqz',
  version: pkg.version,
  description: 'Petbooqz veterinary practice management integration',
  computeLayer: 'serverless',

  tools: import('./src/registries'),

  provision: import('./src/provision'),

  /**
   * Rate-limit queues for Petbooqz API coordination.
   *
   * - petbooqz_availability: read-only slot checks (parallel-friendly)
   * - petbooqz_calendar_booking: mutations serialized per calendar_id (prevents duplicate bookings)
   */
  queues: {
    petbooqz_availability: {
      scope: 'install',
      maxConcurrent: 5,
      minTime: 50,
    },
    petbooqz_calendar_booking: {
      scope: 'install',
      maxConcurrent: 1,
      maxRetries: 2,
      retryDelayMs: 500,
    },
  },
})
