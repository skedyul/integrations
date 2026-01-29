/**
 * Skedyul App Configuration
 * =========================
 *
 * This is the main configuration file for the Email app.
 *
 * Structure:
 *   skedyul.config.ts      - App metadata + imports (this file)
 *   src/registries.ts      - Tool and webhook registries
 *   config/provision.config.ts - Models, channels, workflows, pages, env vars
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
  name: 'Email',

  /** Semantic version - increment on each release */
  version: '1.0.0',

  /** Short description for the app listing */
  description: 'Send and receive emails with your skedyul.app address',

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
  // Registries (from src/registries.ts)
  // ─────────────────────────────────────────────────────────────────────────

  /** Tool registry - callable functions for pages, forms, workflows, API */
  tools: import('./src/registries'),

  /** Webhook registry - HTTP handlers for incoming requests */
  webhooks: import('./src/registries'),

  // ─────────────────────────────────────────────────────────────────────────
  // Provision Configuration
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Resources automatically synced when the app version is deployed:
   *   - env, models, relationships, channels, workflows, pages, webhooks
   */
  provision: import('./config/provision.config'),
})
