import type { ToolDefinition } from 'skedyul'
import { z } from 'skedyul'
import { isRuntimeContext } from 'skedyul'
import { buildGoogleInstallOAuthUrl } from '../lib/google_oauth_redirect'
import type { GoogleInstallEnv } from '../lib/google_install_env'
import { createSuccessResponse, createValidationError } from '../lib/response'

const ReconnectGoogleInputSchema = z.object({})

const ReconnectGoogleOutputSchema = z.object({
  message: z.string(),
})

type ReconnectGoogleInput = z.infer<typeof ReconnectGoogleInputSchema>
type ReconnectGoogleOutput = z.infer<typeof ReconnectGoogleOutputSchema>

export const reconnectGoogleRegistry: ToolDefinition<
  ReconnectGoogleInput,
  ReconnectGoogleOutput
> = {
  name: 'reconnect_google',
  label: 'Reconnect Google',
  description: 'Restart Google OAuth to persist or replace the connected account tokens',
  inputSchema: ReconnectGoogleInputSchema,
  outputSchema: ReconnectGoogleOutputSchema,
  handler: async (_input, context) => {
    if (!isRuntimeContext(context)) {
      return createValidationError('This tool can only be called in a runtime context')
    }

    const oauthUrl = buildGoogleInstallOAuthUrl({
      env: context.env as GoogleInstallEnv,
      appHandle: 'google',
      appInstallationId: context.appInstallationId,
      workplace: context.workplace,
    })

    return createSuccessResponse(
      { message: 'Redirecting to Google to reconnect this account' },
      { effect: { redirect: oauthUrl } },
    )
  },
}
