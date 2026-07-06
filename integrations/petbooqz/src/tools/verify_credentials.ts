import { z, type ToolDefinition, createSuccessResponse, createAuthError } from 'skedyul'
import { PETBOOQZ_API_ONE, PETBOOQZ_API_AVAILABILITY, petbooqzBookingTouchPoints } from '../lib/touch_points'
import { createClientFromEnv } from '../lib/api_client'
import { isPetbooqzError, getErrorMessage, type PetbooqzErrorResponse } from '../lib/types'
import { rethrowRateLimitError } from '../lib/response'

/**
 * Verify Credentials Tool
 *
 * Called during installation (onInstall hook) to verify the user's
 * Petbooqz API credentials are valid before completing the installation.
 *
 * This prevents installations with invalid credentials.
 */

const VerifyCredentialsInputSchema = z.object({})

const VerifyCredentialsOutputSchema = z.object({})

type VerifyCredentialsInput = z.infer<typeof VerifyCredentialsInputSchema>
type VerifyCredentialsOutput = z.infer<typeof VerifyCredentialsOutputSchema>

export const verifyCredentialsRegistry: ToolDefinition<
  VerifyCredentialsInput,
  VerifyCredentialsOutput
> = {
  name: 'verify_credentials',
  label: 'Verify Credentials',
  description: 'Verify Petbooqz API credentials are valid during installation',
  inputSchema: VerifyCredentialsInputSchema,
  outputSchema: VerifyCredentialsOutputSchema,
  timeout: 300000,
  queueTouchPoints: PETBOOQZ_API_ONE,
  handler: async (_input, context) => {
    
      const client = createClientFromEnv(context.env)

      try {
        const response = await client.get<unknown | PetbooqzErrorResponse>('/calendars')

        if (isPetbooqzError(response)) {
          return createAuthError(
            `Invalid credentials: ${getErrorMessage(response as PetbooqzErrorResponse)}`,
          )
        }

        return createSuccessResponse({})
      } catch (error) {
        rethrowRateLimitError(error)
        const errorMessage = error instanceof Error ? error.message : String(error)

        throw new Error(
          `Failed to verify Petbooqz credentials: ${errorMessage}. Please check your API URL, username, password, and API key.`,
        )
      }
  },
}
