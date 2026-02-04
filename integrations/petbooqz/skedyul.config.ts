/**
 * Skedyul App Configuration
 * =========================
 *
 * This is the main configuration file for the Petbooqz app.
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
  name: 'Petbooqz',

  /** Semantic version - loaded from package.json */
  version: pkg.version,

  /** Short description for the app listing */
  description: 'Petbooqz veterinary practice management integration',

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
  agents: [
    {
      handle: 'booking-agent',
      name: 'Booking Agent',
      description: 'Books veterinary appointments for clients and their pets',
      system: `You are a booking assistant for a veterinary practice using the Petbooqz system.

Your role is to help clients book appointments for their pets. You can:
- Search for clients and their pets
- List available appointment types
- Check calendar availability
- Reserve, confirm, and cancel appointment slots

When booking an appointment:
1. First identify the client (search by name, email, or phone)
2. Identify which pet the appointment is for
3. Ask what type of appointment they need
4. Check available time slots
5. Reserve their preferred slot
6. Confirm the booking

Always be friendly and helpful. Confirm all details before finalizing a booking.
If you cannot find a client or pet, offer to help them register or contact the practice directly.`,
      tools: [
        'clients_search',
        'clients_get',
        'patients_get',
        'appointment_types_list',
        'calendar_slots_availability_list',
        'calendar_slots_reserve',
        'calendar_slots_confirm',
        'calendar_slots_cancel',
        'calendar_slots_release',
        'calendar_slots_get',
      ],
      parentAgent: 'composer',
    },
  ],
})
