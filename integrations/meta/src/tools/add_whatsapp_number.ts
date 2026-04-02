import type { ToolDefinition } from 'skedyul'
import { z } from 'skedyul'
import { AppAuthInvalidError, isRuntimeContext } from 'skedyul'
import { instance, communicationChannel } from 'skedyul'
import { MetaClient } from '../lib/meta_client'
import {
  createSuccessResponse,
  createValidationError,
  createAuthError,
  createNotFoundError,
  createMetaError,
} from '../lib/response'

/**
 * Input schema for the add_whatsapp_number form submit handler.
 * This handler is called when a user submits the add WhatsApp number form from the modal.
 */
const AddWhatsAppNumberInputSchema = z.object({
  /** Meta phone number ID (from registered_wa_numbers) */
  phone_number_id: z.string().describe('Meta phone number ID'),
  /** Optional friendly name for the phone number */
  name: z.string().optional().describe('Friendly name for the phone number'),
})

const AddWhatsAppNumberOutputSchema = z.object({
  status: z.string().describe('Submission status'),
  phoneNumber: z.string().optional().describe('The WhatsApp phone number in E.164 format'),
  phoneNumberId: z.string().optional().describe('Meta phone number ID'),
  message: z.string().optional().describe('Status message'),
})

type AddWhatsAppNumberInput = z.infer<typeof AddWhatsAppNumberInputSchema>
type AddWhatsAppNumberOutput = z.infer<typeof AddWhatsAppNumberOutputSchema>

/**
 * Add a WhatsApp phone number to the installation.
 * Creates a whatsapp_phone_number instance and a WhatsApp communication channel.
 */
export const addWhatsAppNumberRegistry: ToolDefinition<
  AddWhatsAppNumberInput,
  AddWhatsAppNumberOutput
> = {
  name: 'add_whatsapp_number',
  label: 'Add WhatsApp Number',
  description:
    'Adds a registered WhatsApp business phone number to the installation',
  inputSchema: AddWhatsAppNumberInputSchema,
  outputSchema: AddWhatsAppNumberOutputSchema,
  handler: async (input, context) => {
    // This is a runtime-only tool (form_submit)
    if (!isRuntimeContext(context)) {
      return createValidationError('This tool can only be called in a runtime context')
    }

    const { phone_number_id, name } = input
    const { appInstallationId, env } = context

    // Validate phone_number_id is provided
    if (!phone_number_id) {
      return createValidationError('Missing required field: phone_number_id')
    }

    // Get env vars
    const META_APP_ID = env.META_APP_ID || process.env.META_APP_ID
    const META_APP_SECRET = env.META_APP_SECRET || process.env.META_APP_SECRET
    const GRAPH_API_VERSION = env.GRAPH_API_VERSION || process.env.GRAPH_API_VERSION
    const META_ACCESS_TOKEN = env.META_ACCESS_TOKEN

    if (!META_ACCESS_TOKEN) {
      return createAuthError('META_ACCESS_TOKEN is not configured. Please complete the OAuth flow.')
    }

    if (!META_APP_ID || !META_APP_SECRET) {
      return createAuthError(
        'META_APP_ID and META_APP_SECRET must be configured. Make sure they are set in the app version\'s provision-level environment variables.',
      )
    }

    if (!GRAPH_API_VERSION) {
      return createAuthError(
        'GRAPH_API_VERSION must be configured. Make sure it is set in the app version\'s provision-level environment variables.',
      )
    }

    // 1. Fetch the meta_connection instance
    console.log('[AddWhatsAppNumber] Fetching meta_connection...')
    const metaConnections = await instance.list('meta_connection', {
      filter: {},
      limit: 1,
    })

    if (metaConnections.data.length === 0) {
      return createNotFoundError('Meta connection', 'Please complete the OAuth flow first.')
    }

    const metaConnection = metaConnections.data[0] as {
      id: string
      waba_id?: string
    }

    if (!metaConnection.waba_id) {
      return createValidationError('Meta connection is missing WABA ID. Please reconnect your Meta account.')
    }

    // 2. Fetch phone number details from Meta API
    console.log('[AddWhatsAppNumber] Fetching phone number details from Meta API...')
    const client = new MetaClient(META_APP_ID, META_APP_SECRET, GRAPH_API_VERSION)

    let phoneNumberDetails: {
      id: string
      display_phone_number: string
      verified_name: string
      quality_rating: string
    }

    try {
      const phoneNumbersResponse = await client.getPhoneNumbers(
        metaConnection.waba_id,
        META_ACCESS_TOKEN,
      )

      const phoneNumber = phoneNumbersResponse.data.find(
        (pn) => pn.id === phone_number_id,
      )

      if (!phoneNumber) {
        return createNotFoundError('Phone number', phone_number_id)
      }

      phoneNumberDetails = {
        id: phoneNumber.id,
        display_phone_number: phoneNumber.display_phone_number,
        verified_name: phoneNumber.verified_name,
        quality_rating: phoneNumber.quality_rating,
      }
    } catch (error) {
      if (error instanceof AppAuthInvalidError) {
        throw error
      }
      console.error(
        '[AddWhatsAppNumber] Failed to fetch phone number details:',
        error,
      )
      return createMetaError(
        `Failed to fetch phone number details: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }

    // 3. Check if this phone number is already added
    console.log('[AddWhatsAppNumber] Checking if phone number already exists...')
    const existingNumbers = await instance.list('whatsapp_phone_number', {
      filter: { phone_number_id: phone_number_id },
      limit: 1,
    })

    if (existingNumbers.data.length > 0) {
      const existing = existingNumbers.data[0] as { id: string; phone?: string }
      return createValidationError(
        `Phone number ${phoneNumberDetails.display_phone_number} is already added`,
      )
    }

    // 4. Create whatsapp_phone_number instance
    console.log('[AddWhatsAppNumber] Creating whatsapp_phone_number instance...')
    const phoneNumberData = {
      phone: phoneNumberDetails.display_phone_number,
      phone_number_id: phoneNumberDetails.id,
      display_name: phoneNumberDetails.verified_name,
      quality_rating: phoneNumberDetails.quality_rating,
      name: name ?? undefined,
      meta_connection: metaConnection.id,
    }

    console.log(
      '[AddWhatsAppNumber] Instance data to create:',
      JSON.stringify(phoneNumberData, null, 2),
    )

    let phoneNumberInstance: { id: string; phone?: string }
    try {
      phoneNumberInstance = await instance.create(
        'whatsapp_phone_number',
        phoneNumberData,
      )

      console.log(
        '[AddWhatsAppNumber] Created whatsapp_phone_number instance:',
        JSON.stringify(phoneNumberInstance, null, 2),
      )

      if (!phoneNumberInstance?.id) {
        return createMetaError('Failed to create WhatsApp phone number record - no instance ID returned')
      }
    } catch (err) {
      console.error(
        '[AddWhatsAppNumber] Failed to create whatsapp_phone_number instance:',
        err,
      )
      return createMetaError(
        `Failed to create WhatsApp phone number: ${err instanceof Error ? err.message : 'Unknown error'}`,
      )
    }

    // 5. Create WhatsApp communication channel
    console.log('[AddWhatsAppNumber] Creating communication channel...')
    try {
      const channel = await communicationChannel.create('whatsapp', {
        name: name ?? `WhatsApp ${phoneNumberDetails.display_phone_number}`,
        identifierValue: phoneNumberDetails.display_phone_number,
      })
      console.log(
        '[AddWhatsAppNumber] Channel created:',
        JSON.stringify(channel, null, 2),
      )
    } catch (channelErr) {
      console.error(
        '[AddWhatsAppNumber] Failed to create communication channel:',
        channelErr,
      )
      // Continue even if channel creation fails - the phone number was already created
      // The user can create the channel later in settings
    }

    return createSuccessResponse(
      {
        status: 'success',
        phoneNumber: phoneNumberDetails.display_phone_number,
        phoneNumberId: phoneNumberDetails.id,
        message: `Successfully added WhatsApp number ${phoneNumberDetails.display_phone_number}`,
      },
      {
        billing: { credits: 1 },
        effect: {
          redirect: `/whatsapp-numbers/${phoneNumberInstance.id}/overview`,
        },
      },
    )
  },
}
