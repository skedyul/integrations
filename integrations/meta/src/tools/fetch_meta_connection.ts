import type { ToolDefinition } from 'skedyul'
import { z } from 'skedyul'
import { isRuntimeContext } from 'skedyul'
import { getMetaConnectionFromEnv } from '../lib/meta_install_env'
import { createSuccessResponse, createValidationError } from '../lib/response'

const FetchMetaConnectionInputSchema = z.object({})

const FetchMetaConnectionOutputSchema = z.object({
  business_name: z.string(),
  waba_id: z.string(),
  status: z.enum(['connected', 'pending', 'error']),
  connected: z.boolean(),
})

type FetchMetaConnectionInput = z.infer<typeof FetchMetaConnectionInputSchema>
type FetchMetaConnectionOutput = z.infer<typeof FetchMetaConnectionOutputSchema>

/**
 * Read the single Meta connection for this installation from install env vars.
 */
export const fetchMetaConnectionRegistry: ToolDefinition<
  FetchMetaConnectionInput,
  FetchMetaConnectionOutput
> = {
  name: 'fetch_meta_connection',
  label: 'Fetch Meta Connection',
  description:
    'Returns the connected Meta account details stored on the installation env',
  inputSchema: FetchMetaConnectionInputSchema,
  outputSchema: FetchMetaConnectionOutputSchema,
  handler: async (_input, context) => {
    if (!isRuntimeContext(context)) {
      return createValidationError('This tool can only be called in a runtime context')
    }

    return createSuccessResponse(getMetaConnectionFromEnv(context.env))
  },
}
