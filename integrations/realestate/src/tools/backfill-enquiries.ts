/**
 * Re-ingest REA enquiries that the Leads API still has but CRM never received.
 *
 * EnquiryCreated webhooks are not retried after HTTP 200, so a window of ignored
 * leads (e.g. agency_not_connected) has to be pulled with GET /lead/v1/enquiries
 * and re-emitted as enquiry.created. Idempotent on CRM unique rea_enquiry_id.
 */

import {
  z,
  type ToolDefinition,
  createSuccessResponse,
  createValidationError,
  createExternalError,
} from 'skedyul'
import {
  BACKFILL_DEFAULT_LIMIT,
  backfillReaEnquiries,
} from '../lib/backfill-enquiries'
import type { ReaClientEnv } from '../lib/rea-types'

const BackfillEnquiriesInputSchema = z.object({
  since: z
    .string()
    .describe('ISO 8601 timestamp (or YYYY-MM-DD) to start reading REA enquiries from'),
  until: z
    .string()
    .optional()
    .describe('ISO 8601 timestamp (or YYYY-MM-DD) to stop at. Defaults to now.'),
  agency_id: z
    .string()
    .optional()
    .describe('Optional 6-letter REA agency id. Defaults to every Ignite-authorized agency.'),
  dry_run: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined
      if (typeof value === 'boolean') return value
      const normalized = value.trim().toLowerCase()
      if (['false', '0', 'no', 'off'].includes(normalized)) return false
      return true
    })
    .describe('When true (the default), report what would be emitted without writing.'),
  limit: z
    .coerce.number()
    .optional()
    .describe(`Maximum enquiries to emit. Defaults to ${BACKFILL_DEFAULT_LIMIT}.`),
})

const BackfillEnquiryItemSchema = z.object({
  id: z.string(),
  agency_id: z.string(),
  received_at: z.string().optional(),
  action: z.enum(['emit', 'skip_existing', 'skip_agency', 'skip_window']),
  skip_reason: z.string().optional(),
})

const BackfillEnquiriesOutputSchema = z.object({
  status: z.enum(['dry_run', 'success', 'partial']),
  dry_run: z.boolean(),
  window_start: z.string(),
  window_end: z.string(),
  agencies_scanned: z.array(z.string()),
  found: z.number(),
  skipped_existing: z.number(),
  skipped_agency: z.number(),
  skipped_window: z.number(),
  emitted: z.number(),
  failed: z.number(),
  items: z.array(BackfillEnquiryItemSchema),
  errors: z.array(z.string()).optional(),
  message: z.string(),
})

type BackfillEnquiriesInput = z.infer<typeof BackfillEnquiriesInputSchema>
type BackfillEnquiriesOutput = z.infer<typeof BackfillEnquiriesOutputSchema>

export const backfillEnquiriesRegistry: ToolDefinition<
  BackfillEnquiriesInput,
  BackfillEnquiriesOutput
> = {
  name: 'backfill_enquiries',
  label: 'Backfill REA enquiries',
  description:
    'GET REA /lead/v1/enquiries since a timestamp and re-emit enquiry.created for leads that are not already in CRM. Dry-run by default. Safe to re-run: skips existing rea_enquiry_id rows.',
  inputSchema: BackfillEnquiriesInputSchema,
  outputSchema: BackfillEnquiriesOutputSchema,
  handler: async (input, context) => {
    const env = context.env as ReaClientEnv

    if (!input.since) {
      return createValidationError('Missing required field: since')
    }

    if (!env.REA_CLIENT_ID || !env.REA_CLIENT_SECRET) {
      return createValidationError(
        'REA partner credentials are not configured. Contact your administrator.',
      )
    }

    try {
      const result = await backfillReaEnquiries(env, input)
      return createSuccessResponse(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (
        message.startsWith('Invalid ISO timestamp') ||
        message.startsWith('until must be after since') ||
        message.startsWith('agency_id must be') ||
        message.startsWith('No lead-capable agencies')
      ) {
        return createValidationError(message)
      }
      console.error('[REA] backfill_enquiries failed:', error)
      return createExternalError('REA', message)
    }
  },
}
