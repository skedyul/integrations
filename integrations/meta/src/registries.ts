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
 *
 * WEBHOOKS
 * --------
 * HTTP endpoints that receive requests from external services:
 *   - PROVISION Level: Shared across all installations, auto-created on deploy
 *   - INSTALL Level: Per-installation
 *   - ACTION Level: Dynamic, created by tool handlers (e.g., OAuth callbacks)
 */

import type { ToolRegistry, WebhookRegistry } from 'skedyul'

// ─────────────────────────────────────────────────────────────────────────────
// Tool Definitions
// ─────────────────────────────────────────────────────────────────────────────

import { sendWhatsAppRegistry } from './tools/send_whatsapp'
import { fetchRegisteredWABusinessNumbersRegistry } from './tools/fetch_registered_wa_business_numbers'
import { addWhatsAppNumberRegistry } from './tools/add_whatsapp_number'

/**
 * Tool Registry
 *
 * Maps tool names (snake_case) to their definitions.
 */
export const toolRegistry: ToolRegistry = {
  /** Send a WhatsApp message via Meta Graph API. Used by the WhatsApp channel. */
  send_whatsapp: sendWhatsAppRegistry,

  /** Fetch registered WhatsApp business numbers from Meta Graph API. Used in page context. */
  fetch_registered_wa_business_numbers: fetchRegisteredWABusinessNumbersRegistry,

  /** Add a registered WhatsApp business number to the installation. Creates instance and channel. */
  add_whatsapp_number: addWhatsAppNumberRegistry,
}

// ─────────────────────────────────────────────────────────────────────────────
// Webhook Definitions
// ─────────────────────────────────────────────────────────────────────────────

import { receiveWhatsAppRegistry } from './webhooks/receive_whatsapp'

/**
 * Webhook Registry
 *
 * Maps webhook names (snake_case) to their handler definitions.
 */
export const webhookRegistry: WebhookRegistry = {
  /** Receive incoming WhatsApp messages from Meta webhooks. PROVISION level. */
  receive_whatsapp: receiveWhatsAppRegistry,
}
