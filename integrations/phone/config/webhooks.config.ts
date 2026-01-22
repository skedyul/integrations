/**
 * Webhook Registry
 * ================
 *
 * This file defines all webhook handlers for the Phone app.
 * Webhooks are HTTP endpoints that receive incoming requests from external services.
 *
 * Webhook Levels:
 *
 *   1. PROVISION Level (shared across all installations)
 *      - Defined in provision.webhooks array: ['receive_sms', 'receive_sms_v2']
 *      - Auto-created when app version is deployed
 *      - Single URL shared by all workplace installations
 *      - Context.appInstallationId is NULL
 *
 *   2. INSTALL Level (per-installation)
 *      - Created via webhook.create() in onInstall hook
 *      - Deleted via webhook.delete() in onUninstall hook
 *      - Unique URL per installation
 *      - Context.appInstallationId is set
 *
 *   3. ACTION Level (dynamic, on-demand)
 *      - Created via webhook.create() in tool handlers
 *      - For temporary callbacks (e.g., OAuth, status updates)
 *      - Can include custom context data
 *      - Context.appInstallationId is set
 *
 * Webhook Handler Structure:
 *   {
 *     description: string,              // Human-readable description
 *     methods: ['POST', 'GET', ...],    // Allowed HTTP methods
 *     handler: async (request, context) => {
 *       // request.body    - Parsed request body
 *       // request.headers - Request headers
 *       // request.query   - Query string parameters
 *       // context.appInstallationId - Installation ID (null for provision)
 *       // context.registration - Custom context from webhook.create()
 *       return { status: 200, body: { ok: true } }
 *     },
 *   }
 */

import { receiveSmsRegistry, receiveSmsV2Registry } from '../src/webhooks/receive-sms'
import { complianceStatusRegistry } from '../src/webhooks/compliance-status'
import type { WebhookRegistry } from 'skedyul'

/**
 * Webhook Registry
 *
 * Maps webhook names to their handler definitions.
 * Webhook names should be snake_case and descriptive.
 */
export const registry: WebhookRegistry = {
  /**
   * Receive incoming SMS messages from Twilio.
   * PROVISION level - shared across all installations.
   * Twilio sends webhooks here when messages arrive.
   */
  receive_sms: receiveSmsRegistry,

  /**
   * Alternative SMS receiver with enhanced features.
   * PROVISION level - shared across all installations.
   */
  receive_sms_v2: receiveSmsV2Registry,

  /**
   * Receive compliance status updates from Twilio.
   * ACTION level - dynamically created per compliance submission.
   * Twilio calls this when a regulatory bundle status changes.
   * Created by submit_compliance_document tool with custom context.
   */
  compliance_status: complianceStatusRegistry,
}

/** Type-safe webhook name union (for internal use) */
export type WebhookName = keyof typeof registry
