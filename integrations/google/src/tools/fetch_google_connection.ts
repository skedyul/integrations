import type { ToolDefinition } from 'skedyul'
import { z } from 'skedyul'
import { isRuntimeContext } from 'skedyul'
import { getGoogleConnectionFromEnv } from '../lib/google_install_env'
import { createSuccessResponse, createValidationError } from '../lib/response'

const FetchGoogleConnectionInputSchema = z.object({})

const FetchGoogleConnectionOutputSchema = z.object({
  email: z.string(),
  status: z.enum(['connected', 'pending', 'error']),
  connected: z.boolean(),
})

type FetchGoogleConnectionInput = z.infer<typeof FetchGoogleConnectionInputSchema>
type FetchGoogleConnectionOutput = z.infer<typeof FetchGoogleConnectionOutputSchema>

export const fetchGoogleConnectionRegistry: ToolDefinition<
  FetchGoogleConnectionInput,
  FetchGoogleConnectionOutput
> = {
  name: 'fetch_google_connection',
  label: 'Fetch Google Connection',
  description: 'Returns the connected Google account details stored on the installation env',
  inputSchema: FetchGoogleConnectionInputSchema,
  outputSchema: FetchGoogleConnectionOutputSchema,
  handler: async (_input, context) => {
    if (!isRuntimeContext(context)) {
      return createValidationError('This tool can only be called in a runtime context')
    }

    return createSuccessResponse(getGoogleConnectionFromEnv(context.env))
  },
}
