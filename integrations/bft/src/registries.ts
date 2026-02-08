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

import { getScheduleRegistry } from './tools/get_schedule'
import { getPackagesRegistry } from './tools/get_packages'
import { getIntroOfferRegistry } from './tools/get_intro_offer'
import { getBusinessDetailsRegistry } from './tools/get_business_details'
import { refreshDataRegistry } from './tools/refresh_data'
import { syncPackagesRegistry } from './tools/sync_packages'
import { syncClassesRegistry } from './tools/sync_classes'
import { updateBusinessDetailsRegistry } from './tools/update_business_details'

/**
 * Tool Registry
 *
 * Maps tool names (snake_case) to their definitions.
 */
export const toolRegistry: ToolRegistry = {
  /** Scrapes and returns the current class schedule (always fresh) */
  get_schedule: getScheduleRegistry,

  /** Returns all membership packages from the Packages model */
  get_packages: getPackagesRegistry,

  /** Returns the intro offer from the Packages model */
  get_intro_offer: getIntroOfferRegistry,

  /** Returns business contact information from the BusinessDetails model */
  get_business_details: getBusinessDetailsRegistry,

  /** Re-scrapes the BFT website and updates Packages, Classes, and BusinessDetails models */
  refresh_data: refreshDataRegistry,

  /** Re-scrapes the BFT website and updates only the Packages model */
  sync_packages: syncPackagesRegistry,

  /** Re-scrapes the BFT website and updates only the Classes model */
  sync_classes: syncClassesRegistry,

  /** Updates business contact information in the BusinessDetails model */
  update_business_details: updateBusinessDetailsRegistry,
}
