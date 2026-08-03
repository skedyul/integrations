/**
 * Check Ignite Integration Tool
 *
 * Calls the REA Integrations API, reconciles internal agency records, and
 * completes/invalidates the connect_agencies setup step. Invoked inline from
 * the setup page with no form fields.
 */

import {
  z,
  type ToolDefinition,
  createSuccessResponse,
  createValidationError,
} from 'skedyul'
import { reconcileAgenciesFromIntegrationsApi } from '../lib/reconcile-agencies'
import { IGNITE_INTEGRATIONS_URL, type ReaClientEnv } from '../lib/rea-types'

const CheckIgniteInputSchema = z.object({})

const AgencyStatusSchema = z.object({
  agency_id: z.string(),
  integration_id: z.string(),
  scopes: z.array(z.string()),
  status: z.enum(['ACTIVE', 'REVOKED']),
})

const CheckIgniteOutputSchema = z.object({
  enabled: z.boolean(),
  active_count: z.number().int(),
  agencies: z.array(AgencyStatusSchema),
  message: z.string(),
  ignite_url: z.string(),
})

type CheckIgniteInput = z.infer<typeof CheckIgniteInputSchema>
type CheckIgniteOutput = z.infer<typeof CheckIgniteOutputSchema>

export const checkIgniteIntegrationRegistry: ToolDefinition<
  CheckIgniteInput,
  CheckIgniteOutput
> = {
  name: 'check_ignite_integration',
  label: 'Check Ignite Status',
  description:
    'Check whether agencies have authorized this partner in Ignite and sync agency records for lead webhooks.',
  inputSchema: CheckIgniteInputSchema,
  outputSchema: CheckIgniteOutputSchema,
  handler: async (_input, context) => {
    const env = context.env as ReaClientEnv

    if (!env.REA_CLIENT_ID || !env.REA_CLIENT_SECRET) {
      return createValidationError(
        'REA partner credentials are not configured. Contact your administrator.',
      )
    }

    try {
      const result = await reconcileAgenciesFromIntegrationsApi(env)

      return createSuccessResponse({
        enabled: result.enabled,
        active_count: result.activeCount,
        agencies: result.agencies,
        message: result.message,
        ignite_url: IGNITE_INTEGRATIONS_URL,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('[REA] check_ignite_integration failed:', error)
      return createValidationError(`Failed to check Ignite integrations: ${message}`)
    }
  },
}
