/**
 * Tool & Webhook Registries
 * ==========================
 *
 * This is the single source of truth for all tools and webhooks in this app.
 * Both the runtime (MCP server) and deployment config import from here.
 *
 * TOOLS
 * -----
 * Callable functions that can be invoked by:
 *   - Page Actions (button clicks)
 *   - Form Handlers (FORM field submissions)
 *   - Workflow Steps (automation actions)
 *   - Field Handlers (on-change events)
 *   - API Calls (direct JSON-RPC via Core API)
 */

import type { ToolRegistry } from 'skedyul'

// ─────────────────────────────────────────────────────────────────────────────
// Tool Definitions
// ─────────────────────────────────────────────────────────────────────────────

import { appointmentTypesListRegistry } from './tools/appointment_types_list'
import { calendarSlotsAvailabilityListRegistry } from './tools/calendar_slots_availability_list'
import { calendarSlotsCancelRegistry } from './tools/calendar_slots_cancel'
import { calendarSlotsConfirmRegistry } from './tools/calendar_slots_confirm'
import { calendarSlotsGetRegistry } from './tools/calendar_slots_get'
import { calendarSlotsReleaseRegistry } from './tools/calendar_slots_release'
import { calendarSlotsReserveRegistry } from './tools/calendar_slots_reserve'
import { calendarsListRegistry } from './tools/calendars_list'
import { clientsGetRegistry } from './tools/clients_get'
import { patientHistoryCreateRegistry } from './tools/patient_history_create'
import { patientHistoryGetRegistry } from './tools/patient_history_get'
import { patientHistoryUpdateRegistry } from './tools/patient_history_update'
import { patientsGetRegistry } from './tools/patients_get'
import { verifyCredentialsRegistry } from './tools/verify_credentials'

/**
 * Tool Registry
 *
 * Maps tool names (snake_case) to their definitions.
 */
export const toolRegistry: ToolRegistry = {
  /** List all appointment types available in Petbooqz */
  appointment_types_list: appointmentTypesListRegistry,

  /** List available calendar slots for given calendars and dates */
  calendar_slots_availability_list: calendarSlotsAvailabilityListRegistry,

  /** Cancel a calendar slot */
  calendar_slots_cancel: calendarSlotsCancelRegistry,

  /** Confirm a calendar slot booking */
  calendar_slots_confirm: calendarSlotsConfirmRegistry,

  /** Get details of a specific calendar slot */
  calendar_slots_get: calendarSlotsGetRegistry,

  /** Release a reserved calendar slot */
  calendar_slots_release: calendarSlotsReleaseRegistry,

  /** Reserve a calendar slot */
  calendar_slots_reserve: calendarSlotsReserveRegistry,

  /** List all calendars */
  calendars_list: calendarsListRegistry,

  /** Get client information by ID */
  clients_get: clientsGetRegistry,

  /** Create a patient history entry */
  patient_history_create: patientHistoryCreateRegistry,

  /** Get patient history */
  patient_history_get: patientHistoryGetRegistry,

  /** Update patient history */
  patient_history_update: patientHistoryUpdateRegistry,

  /** Get patient information by ID */
  patients_get: patientsGetRegistry,

  /** Verify Petbooqz credentials during installation (onInstall hook) */
  verify_credentials: verifyCredentialsRegistry,
}
