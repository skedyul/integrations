/**
 * Skedyul App Configuration
 * =========================
 *
 * This is the main configuration file for the BFT app.
 *
 * Structure:
 *   skedyul.config.ts           - App metadata + imports (this file)
 *   src/registries.ts           - Tool and webhook registries
 *   config/provision.config.ts  - Models, relationships (provision-level)
 *   config/install.config.ts    - Per-install env vars, lifecycle hooks
 *
 * Dynamic imports are resolved at build/deploy time.
 * The compiled config is stored in the database for runtime use.
 */

import { defineConfig } from 'skedyul'
import pkg from './package.json'

export default defineConfig({
  // ─────────────────────────────────────────────────────────────────────────
  // App Metadata
  // ─────────────────────────────────────────────────────────────────────────

  /** Display name shown in the app marketplace and settings */
  name: 'BFT',

  /** Semantic version - loaded from package.json */
  version: pkg.version,

  /** Short description for the app listing */
  description: 'Body Fit Training website scraper integration',

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

  // ─────────────────────────────────────────────────────────────────────────
  // Provision Configuration
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Resources automatically synced when the app version is deployed:
   *   - models, relationships, channels, workflows, pages
   */
  provision: import('./config/provision.config'),

  // ─────────────────────────────────────────────────────────────────────────
  // Install Configuration
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Per-install configuration:
   *   - env: Credentials collected during install, passed at runtime
   *   - onInstall: Tool to verify credentials before completing installation
   */
  install: import('./config/install.config'),

  // ─────────────────────────────────────────────────────────────────────────
  // Agents
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * AI agents with specific tool access.
   * These are synced globally during provisioning and available to all
   * workplaces that install this app.
   */
  agents: [],
})
