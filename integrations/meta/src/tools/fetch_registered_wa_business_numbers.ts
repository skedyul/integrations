import type { ToolDefinition } from 'skedyul'
import { z } from 'skedyul'
import { AppAuthInvalidError, isRuntimeContext } from 'skedyul'
import { MetaClient } from '../lib/meta_client'
import {
  requireMetaAccessToken,
  requireMetaWabaId,
} from '../lib/meta_install_env'
import {
  createSuccessResponse,
  createValidationError,
  createMetaError,
} from '../lib/response'

/**
 * Input schema - no inputs needed, tool gets data from context
 */
const FetchRegisteredWABusinessNumbersInputSchema = z.object({})

/**
 * Output schema - array of registered WhatsApp business numbers
 */
const FetchRegisteredWABusinessNumbersOutputSchema = z.array(
  z.object({
    id: z.string().describe('Meta phone number ID'),
    display_phone_number: z.string().describe('Display phone number (E.164 format)'),
    verified_name: z.string().describe('Verified business name for this number'),
    quality_rating: z
      .enum(['GREEN', 'YELLOW', 'RED', 'UNKNOWN'])
      .describe('Quality rating from Meta'),
  }),
)

type FetchRegisteredWABusinessNumbersInput = z.infer<
  typeof FetchRegisteredWABusinessNumbersInputSchema
>
type FetchRegisteredWABusinessNumbersOutput = z.infer<
  typeof FetchRegisteredWABusinessNumbersOutputSchema
>

/**
 * Fetch registered WhatsApp business numbers from Meta Graph API.
 * This tool is used in page context to populate available phone numbers
 * that can be added to the installation.
 */
export const fetchRegisteredWABusinessNumbersRegistry: ToolDefinition<
  FetchRegisteredWABusinessNumbersInput,
  FetchRegisteredWABusinessNumbersOutput
> = {
  name: 'fetch_registered_wa_business_numbers',
  label: 'Fetch Registered WhatsApp Business Numbers',
  description:
    'Fetches all registered WhatsApp business phone numbers from Meta Graph API for the connected WABA',
  inputSchema: FetchRegisteredWABusinessNumbersInputSchema,
  outputSchema: FetchRegisteredWABusinessNumbersOutputSchema,
  handler: async (input, context) => {
    // This is a runtime-only tool (page_context trigger)
    if (!isRuntimeContext(context)) {
      return createValidationError('This tool can only be called in a runtime context')
    }

    const { appInstallationId, env } = context

    // Get env vars
    const META_APP_ID = env.META_APP_ID || process.env.META_APP_ID
    const META_APP_SECRET = env.META_APP_SECRET || process.env.META_APP_SECRET
    const GRAPH_API_VERSION = env.GRAPH_API_VERSION || process.env.GRAPH_API_VERSION

    try {
      requireMetaAccessToken(env)
    } catch {
      return createSuccessResponse([])
    }

    if (!META_APP_ID || !META_APP_SECRET) {
      throw new Error(
        'META_APP_ID and META_APP_SECRET must be configured. Make sure they are set in the app version\'s provision-level environment variables.',
      )
    }

    if (!GRAPH_API_VERSION) {
      throw new Error(
        'GRAPH_API_VERSION must be configured. Make sure it is set in the app version\'s provision-level environment variables.',
      )
    }

    let wabaId: string
    try {
      wabaId = requireMetaWabaId(env)
    } catch {
      return createSuccessResponse([])
    }

    const accessToken = requireMetaAccessToken(env)
    const client = new MetaClient(META_APP_ID, META_APP_SECRET, GRAPH_API_VERSION)

    try {
      const phoneNumbersResponse = await client.getPhoneNumbers(wabaId, accessToken)

      // Transform to output format
      const phoneNumbers = phoneNumbersResponse.data.map((phoneNumber) => ({
        id: phoneNumber.id,
        display_phone_number: phoneNumber.display_phone_number,
        verified_name: phoneNumber.verified_name,
        quality_rating: phoneNumber.quality_rating,
      }))

      return createSuccessResponse(phoneNumbers, { billing: { credits: 1 } })
    } catch (error) {
      if (error instanceof AppAuthInvalidError) {
        // Re-throw auth errors so they're handled properly
        throw error
      }
      console.error(
        '[fetchRegisteredWABusinessNumbers] Failed to fetch phone numbers:',
        error,
      )
      // On error, return failure
      return createMetaError(
        `Failed to fetch phone numbers: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  },
}
