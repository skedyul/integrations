/**
 * Skedyul App Configuration
 * =========================
 *
 * This is the main configuration file for your Skedyul app.
 * It defines metadata and imports modular configuration from the config/ folder.
 *
 * Structure:
 *   skedyul.config.ts     - App metadata + imports (this file)
 *   config/
 *     tools.config.ts     - Tool registry (callable functions)
 *     webhooks.config.ts  - Webhook handlers (incoming HTTP endpoints)
 *     provision.config.ts - Models, channels, workflows, pages, env vars
 *
 * Dynamic imports are resolved at build/deploy time.
 * The compiled config is stored in the database for runtime use.
 */

import { defineConfig } from 'skedyul'

export default defineConfig({
  // ─────────────────────────────────────────────────────────────────────────
  // App Metadata
  // ─────────────────────────────────────────────────────────────────────────

  /** Display name shown in the app marketplace and settings */
  name: 'Phone',

  /** Semantic version - increment on each release */
  version: '1.0.0',

  /** Short description for the app listing */
  description: 'SMS and voice communication via Twilio',

  // ─────────────────────────────────────────────────────────────────────────
  // Runtime Configuration
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Compute layer determines how the app runs:
   *   - 'serverless': AWS Lambda - fast cold starts, pay-per-use, auto-scaling
   *   - 'dedicated':  ECS/Docker - persistent connections, custom runtimes
   */
  computeLayer: 'serverless',

  // ─────────────────────────────────────────────────────────────────────────
  // Modular Configuration Imports
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Tool Registry
   * Maps tool names to handler functions that can be invoked by:
   *   - Page actions (button clicks)
   *   - Form submissions
   *   - Workflow steps
   *   - API calls
   */
  tools: import('./config/tools.config'),

  /**
   * Webhook Registry
   * Maps webhook names to handler functions that process incoming HTTP requests.
   * Webhooks can be registered at different levels:
   *   - Provision: Auto-created when app is deployed (shared across all installs)
   *   - Install:   Created during app installation (per-installation)
   *   - Action:    Dynamically created by tool handlers (e.g., for callbacks)
   */
  webhooks: import('./config/webhooks.config'),

  /**
   * Provision Configuration
   * Resources automatically synced when the app version is deployed:
   *   - env:           Environment variable schemas
   *   - models:        Data models (INTERNAL or SHARED)
   *   - relationships: Links between models
   *   - channels:      Communication channels (SMS, email, etc.)
   *   - workflows:     Automation templates
   *   - pages:         UI screens for the app
   *   - webhooks:      Provision-level webhook handlers to auto-register
   */
  provision: import('./config/provision.config'),
})
