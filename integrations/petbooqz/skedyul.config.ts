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
      handle: 'booking_query_agent',
      name: 'Booking Query Agent',
      description: 'Answers questions about calendars and availability',
      system: `Veterinary booking query assistant. Answer questions about calendars and availability.
        Tools:
        - calendars_list: List available calendars/rooms
        - calendar_slots_availability_list: Check available slots for date/calendar

        For availability queries, ask for date and calendar name if not provided.`,
      tools: [
        'calendars_list',
        'calendar_slots_availability_list',
      ],
      parentAgent: 'composer',
    },
    {
      handle: 'booking_search_agent',
      name: 'Booking Search Agent',
      description: 'Finds clients and patients by name, email, or phone',
      system: `Client and patient lookup assistant. Search and retrieve client/patient records.

Workflow:
1. Use clients_search to find clients by name, email, or phone
2. Use clients_get to retrieve full client details
3. Use patients_get to get pet details using patient_id from client record

Always confirm which client/patient before proceeding.`,
      tools: [
        'clients_search',
        'clients_get',
        'patients_get',
      ],
      parentAgent: 'composer',
    },
    {
      handle: 'booking_agent',
      name: 'Booking Agent',
      description: 'Books appointments and checks availability',
      system: `Appointment booking assistant. Book appointments and check availability.

Tools:
- calendar_slots_availability_list: Check available slots for date/calendar
- calendar_slots_book: Book an appointment (reserves and confirms in one step)

Slot times are 12-hour format. Bookings are confirmed immediately.`,
      tools: [
        'calendar_slots_availability_list',
        'calendar_slots_book',
      ],
      parentAgent: 'composer',
    },
    {
      handle: 'booking_cancel_agent',
      name: 'Booking Cancel Agent',
      description: 'Cancels appointments and checks appointment status',
      system: `Appointment cancellation assistant. Cancel appointments and check status.

Tools:
- calendar_slots_get: Check appointment status/details
- calendar_slots_cancel: Cancel a confirmed appointment

Use calendar_slots_get to verify appointment details before canceling.`,
      tools: [
        'calendar_slots_get',
        'calendar_slots_cancel',
      ],
      parentAgent: 'composer',
    }
  ],
})
