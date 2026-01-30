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

import { sendEmailRegistry } from './tools/send_email'
import { updateEmailAddressRegistry } from './tools/update_email_address'
import { installRegistry } from './tools/install'
import { uninstallRegistry } from './tools/uninstall'
import { setupMailgunRoutesRegistry } from './tools/setup_mailgun_routes'

/**
 * Tool Registry
 *
 * Maps tool names (snake_case) to their definitions.
 */
export const toolRegistry: ToolRegistry = {
  /** Send an email message via the configured provider. */
  send_email: sendEmailRegistry,

  /** Update email address display name. */
  update_email_address: updateEmailAddressRegistry,

  /** Install hook - creates {subdomain}@skedyul.app email address. */
  install: installRegistry,

  /** Uninstall hook - removes {subdomain}@skedyul.app email address. */
  uninstall: uninstallRegistry,

  /** Provision hook - creates/updates Mailgun routes for receiving emails. */
  setup_mailgun_routes: setupMailgunRoutesRegistry,
}

// ─────────────────────────────────────────────────────────────────────────────
// Webhook Definitions
// ─────────────────────────────────────────────────────────────────────────────

import { receiveEmailRegistry } from './webhooks/receive_email'

/**
 * Webhook Registry
 *
 * Maps webhook names (snake_case) to their handler definitions.
 */
export const webhookRegistry: WebhookRegistry = {
  /** Receive incoming emails from the email provider. PROVISION level. */
  receive_email: receiveEmailRegistry,
}
