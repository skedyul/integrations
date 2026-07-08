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

import { sendSmsRegistry } from './tools/send_sms'
import { sendSmsBatchRegistry } from './tools/send_sms_batch'
import { submitComplianceDocumentRegistry } from './tools/submit_compliance_document'
import { checkComplianceStatusRegistry } from './tools/check_compliance_status'
import { submitNewPhoneNumberRegistry } from './tools/submit_new_phone_number'
import { removePhoneNumberRegistry } from './tools/remove_phone_number'
import { updatePhoneDetailsRegistry } from './tools/update_phone_details'
import { updateForwardingNumberRegistry } from './tools/update_forwarding_number'
import { updateOutboundVoiceRegistry } from './tools/update_outbound_voice'
import { syncTwilioWebhookRegistry } from './tools/sync_twilio_webhook'

/**
 * Tool Registry
 *
 * Maps tool names (snake_case) to their definitions.
 */
export const toolRegistry: ToolRegistry = {
  /** Send an SMS message via Twilio. Used by the SMS channel. */
  send_sms: sendSmsRegistry,

  /** Send pre-rendered SMS messages in bulk via Twilio Bulk Messaging API. */
  send_sms_batch: sendSmsBatchRegistry,

  /** Submit compliance documents to Twilio for regulatory approval. */
  submit_compliance_document: submitComplianceDocumentRegistry,

  /** Check the current status of a compliance submission. */
  check_compliance_status: checkComplianceStatusRegistry,

  /** Search for and purchase an Australian mobile phone number from Twilio. */
  submit_new_phone_number: submitNewPhoneNumberRegistry,

  /** Remove a phone number from the account, deleting its SMS channel. */
  remove_phone_number: removePhoneNumberRegistry,

  /** Update phone number details (name) in both the phone_number model and communication channel. */
  update_phone_details: updatePhoneDetailsRegistry,

  /** Update inbound voice settings, forwarding number, and Twilio voiceUrl/webhooks. */
  update_forwarding_number: updateForwardingNumberRegistry,

  /** Update the outbound voice enabled setting for a phone number. */
  update_outbound_voice: updateOutboundVoiceRegistry,

  /** Sync the SMS webhook URL to Twilio for a given phone number. */
  sync_twilio_webhook: syncTwilioWebhookRegistry,
}

// ─────────────────────────────────────────────────────────────────────────────
// Webhook Definitions
// ─────────────────────────────────────────────────────────────────────────────

import { receiveSmsRegistry, receiveSmsV2Registry } from './webhooks/receive_sms'
import { complianceStatusRegistry } from './webhooks/compliance_status'
import { receiveCallRegistry } from './webhooks/receive_call'
import { callTranscriptionRegistry } from './webhooks/call_transcription'
import { callStatusRegistry } from './webhooks/call_status'

/**
 * Webhook Registry
 *
 * Maps webhook names (snake_case) to their handler definitions.
 */
export const webhookRegistry: WebhookRegistry = {
  /** Receive incoming SMS messages from Twilio. PROVISION level. */
  receive_sms: receiveSmsRegistry,

  /** Forward inbound voice calls and start real-time transcription. */
  receive_call: receiveCallRegistry,

  /** Receive Twilio Real-Time Transcription events for a call. ACTION level (per-call). */
  call_transcription: callTranscriptionRegistry,

  /** Receive Twilio call/dial status callbacks for a call. ACTION level (per-call). */
  call_status: callStatusRegistry,

  /** Receive compliance status updates from Twilio. ACTION level. */
  compliance_status: complianceStatusRegistry,
}
