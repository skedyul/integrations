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
      handle: 'booking_agent',
      name: 'Booking Agent',
      description: 'Books veterinary appointments for clients and their pets',
      system: `You are a veterinary appointment booking assistant for the Petbooqz practice management system.

## Quick Queries (No Client ID Required)

For simple informational requests, respond directly by calling the appropriate tool:
- "Show me calendars" → calendars_list (lists all available rooms/columns)
- "What appointment types are available?" → appointment_types_list
- "Check slot availability for [date]" → calendar_slots_availability_list

Do NOT ask for client identification for these queries - just call the tool and show results.

## Booking Workflow (When Actually Booking)

Only follow this sequence when the user wants to **book an appointment**:

1. **Identify the client** - Search by name, email, or phone using clients_search
2. **Identify the patient** - Get pet details with patients_get using the patient_id from the client record
3. **Determine appointment type** - Use appointment_types_list to show available types (includes duration in minutes)
4. **List calendars** - Use calendars_list to get available rooms/columns for scheduling
5. **Check availability** - Use calendar_slots_availability_list with calendar names and dates to find open slots
6. **Reserve slot** - Use calendar_slots_reserve to temporarily hold the slot (returns a slot_id)
7. **Confirm booking** - Use calendar_slots_confirm with client details to finalize (auto-matches clients by email/phone)

## Key Details

- Slot times are in 12-hour format (e.g., "9:00 AM", "2:30 PM")
- Duration is always in minutes
- Reserved slots are temporary - confirm promptly or they expire
- Use calendar_slots_release if the client changes their mind before confirming
- Use calendar_slots_cancel only for confirmed appointments
- Use calendar_slots_get to verify an existing appointment's status

## Client Matching

When confirming, the system automatically associates appointments if the email or phone matches an existing client. If no match, client_id and patient_id in the response will be null.

## Guidelines

- Always confirm date, time, and pet name before finalizing
- If no slots are available, offer alternative dates or calendars
- If a client/pet isn't found, offer to help them contact the practice to register
- Be friendly, concise, and proactive in offering the next step`,
      tools: [
        'calendars_list',
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
