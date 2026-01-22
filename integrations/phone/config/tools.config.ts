/**
 * Tool Registry
 * =============
 *
 * This file defines all callable tools (functions) for the Phone app.
 * Tools can be invoked by:
 *
 *   1. Page Actions    - Button clicks on app pages
 *   2. Form Handlers   - Form submissions with FORM field types
 *   3. Workflow Steps  - Automation workflow actions
 *   4. Field Handlers  - On-change handlers for page fields
 *   5. API Calls       - Direct JSON-RPC calls via the Core API
 *
 * Each tool is defined in its own file under src/tools/ and imported here.
 * The registry maps tool names (strings) to tool definitions.
 *
 * Tool Definition Structure:
 *   {
 *     description: string,           // Human-readable description
 *     schema: ZodSchema,             // Input validation schema
 *     handler: (args, ctx) => {...}, // The function that runs
 *     triggers?: ['button', ...],    // What can invoke this tool
 *   }
 *
 * Example Usage in skedyul.config.ts:
 *   pages: [{
 *     blocks: [{
 *       fields: [{ handler: 'send_sms' }]  // References this registry
 *     }]
 *   }]
 */

import { sendSmsRegistry } from '../src/tools/send-sms'
import { submitComplianceDocumentRegistry } from '../src/tools/submit-compliance-document'
import { checkComplianceStatusRegistry } from '../src/tools/check-compliance-status'
import type { ToolRegistry } from 'skedyul'

/**
 * Tool Registry
 *
 * Maps tool names to their definitions.
 * Tool names should be snake_case and descriptive.
 */
export const registry: ToolRegistry = {
  /**
   * Send an SMS message via Twilio.
   * Used by the SMS channel's send_message binding.
   */
  send_sms: sendSmsRegistry,

  /**
   * Submit compliance documents to Twilio for regulatory approval.
   * Creates End-User, Document, and Bundle in Twilio's Regulatory API.
   * Invoked by the compliance form submission.
   */
  submit_compliance_document: submitComplianceDocumentRegistry,

  /**
   * Check the current status of a compliance submission.
   * Queries Twilio's Regulatory API for bundle status updates.
   */
  check_compliance_status: checkComplianceStatusRegistry,
}

/** Type-safe tool name union (for internal use) */
export type ToolName = keyof typeof registry
