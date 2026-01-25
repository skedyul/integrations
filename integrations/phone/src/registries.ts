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
 *   - INSTALL Level: Per-installation, created in onInstall/onUninstall hooks
 *   - ACTION Level: Dynamic, created by tool handlers (e.g., OAuth callbacks)
 */

import type { ToolRegistry, WebhookRegistry } from 'skedyul'

// ─────────────────────────────────────────────────────────────────────────────
// Tool Definitions
// ─────────────────────────────────────────────────────────────────────────────

import { sendSmsRegistry } from './tools/send-sms'
import { submitComplianceDocumentRegistry } from './tools/submit-compliance-document'
import { checkComplianceStatusRegistry } from './tools/check-compliance-status'
import { submitNewPhoneNumberRegistry } from './tools/submit-new-phone-number'
import { removePhoneNumberRegistry } from './tools/remove-phone-number'

/**
 * Tool Registry
 *
 * Maps tool names (snake_case) to their definitions.
 */
export const toolRegistry: ToolRegistry = {
  /** Send an SMS message via Twilio. Used by the SMS channel. */
  send_sms: sendSmsRegistry,

  /** Submit compliance documents to Twilio for regulatory approval. */
  submit_compliance_document: submitComplianceDocumentRegistry,

  /** Check the current status of a compliance submission. */
  check_compliance_status: checkComplianceStatusRegistry,

  /** Search for and purchase an Australian mobile phone number from Twilio. */
  submit_new_phone_number: submitNewPhoneNumberRegistry,

  /** Remove a phone number from the account, deleting its SMS channel. */
  remove_phone_number: removePhoneNumberRegistry,
}

// ─────────────────────────────────────────────────────────────────────────────
// Webhook Definitions
// ─────────────────────────────────────────────────────────────────────────────

import { receiveSmsRegistry, receiveSmsV2Registry } from './webhooks/receive-sms'
import { complianceStatusRegistry } from './webhooks/compliance-status'

/**
 * Webhook Registry
 *
 * Maps webhook names (snake_case) to their handler definitions.
 */
export const webhookRegistry: WebhookRegistry = {
  /** Receive incoming SMS messages from Twilio. PROVISION level. */
  receive_sms: receiveSmsRegistry,

  /** Alternative SMS receiver with enhanced features. PROVISION level. */
  receive_sms_v2: receiveSmsV2Registry,

  /** Receive compliance status updates from Twilio. ACTION level. */
  compliance_status: complianceStatusRegistry,
}
