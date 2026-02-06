import { z, type ToolDefinition } from 'skedyul'
import { createClientFromEnv } from '../lib/api_client'
import { createToolResponse } from '../lib/response'
import { isPetbooqzError, getErrorMessage, type PetbooqzErrorResponse } from '../lib/types'

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
  handler: async (_input, context) => {
    // Create API client from the install env vars
    const client = createClientFromEnv(context.env)

    try {
      // Attempt to list calendars as a simple verification
      // This endpoint should be accessible with valid credentials
      const response = await client.get<unknown | PetbooqzErrorResponse>('/calendars')

      if (isPetbooqzError(response)) {
        // Return failure instead of throwing - allows caller to handle
        return createToolResponse<VerifyCredentialsOutput>('verify_credentials', {
          success: false,
          error: `Invalid credentials: ${getErrorMessage(response as PetbooqzErrorResponse)}`,
        })
      }

      return createToolResponse('verify_credentials', {
        success: true,
        data: {},
        message: 'Petbooqz API credentials verified successfully',
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      // Throw to prevent installation from completing
      throw new Error(
        `Failed to verify Petbooqz credentials: ${errorMessage}. Please check your API URL, username, password, and API key.`,
      )
    }
  },
}
