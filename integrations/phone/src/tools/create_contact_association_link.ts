import skedyul, { type z as ZodType, contactAssociationLink, isRuntimeContext } from 'skedyul'
import type { ToolDefinition } from 'skedyul'

const { z } = skedyul

/**
 * Input schema for the create_contact_association_link form submit handler.
 * This handler is called when a user submits the contact association form from the modal.
 */
const CreateContactAssociationLinkInputSchema = z.object({
  /** Model ID to link contacts to */
  linked_model: z.string().describe('Model ID to link contacts to'),
  /** Field ID to use as the identifier (phone/email) */
  identifier_field: z.string().describe('Field ID to use as the identifier'),
  /** Communication channel ID (optional - derived from context if not provided) */
  communication_channel_id: z.string().optional().describe('Communication channel ID'),
})

const CreateContactAssociationLinkOutputSchema = z.object({
  status: z.string().describe('Submission status'),
  linkId: z.string().optional().describe('The created ContactAssociationLink ID'),
  message: z.string().optional().describe('Status message'),
})

type CreateContactAssociationLinkInput = ZodType.infer<typeof CreateContactAssociationLinkInputSchema>
type CreateContactAssociationLinkOutput = ZodType.infer<typeof CreateContactAssociationLinkOutputSchema>

export const createContactAssociationLinkRegistry: ToolDefinition<
  CreateContactAssociationLinkInput,
  CreateContactAssociationLinkOutput
> = {
  name: 'create_contact_association_link',
  description: 'Creates a contact association link between a communication channel and a model',
  inputs: CreateContactAssociationLinkInputSchema,
  outputSchema: CreateContactAssociationLinkOutputSchema,
  handler: async (input, context) => {
    // This is a runtime-only tool (form_submit)
    if (!isRuntimeContext(context)) {
      return {
        output: {
          status: 'error',
          message: 'This tool can only be called in a runtime context',
        },
        billing: { credits: 0 },
      }
    }

    const { linked_model: modelId, identifier_field: identifierFieldId, communication_channel_id } = input
    const { appInstallationId, workplace } = context

    // Determine communication channel ID
    const channelId = communication_channel_id
    if (!channelId) {
      return {
        output: {
          status: 'error',
          message: 'Missing required field: communication_channel_id. Either provide it or ensure context has a channel.',
        },
        billing: { credits: 0 },
      }
    }

    // Validate model ID is provided
    if (!modelId) {
      return {
        output: {
          status: 'error',
          message: 'Missing required field: linked_model. Please select a model to link contacts to.',
        },
        billing: { credits: 0 },
      }
    }

    // Validate identifier field is provided
    if (!identifierFieldId) {
      return {
        output: {
          status: 'error',
          message: 'Missing required field: identifier_field. Please select the field to use as the identifier.',
        },
        billing: { credits: 0 },
      }
    }

    try {
      // Create the contact association link using the skedyul SDK
      const link = await contactAssociationLink.create({
        communicationChannelId: channelId,
        modelId,
        identifierFieldId,
      })

      console.log('[ContactAssociationLink] Created link:', link.id)

      return {
        output: {
          status: 'success',
          linkId: link.id,
          message: `Successfully linked ${link.modelName} to this channel`,
        },
        billing: { credits: 0 },
      }
    } catch (err) {
      console.error('[ContactAssociationLink] Failed to create link:', err)
      return {
        output: {
          status: 'error',
          message: `Failed to create contact association link: ${err instanceof Error ? err.message : 'Unknown error'}`,
        },
        billing: { credits: 0 },
      }
    }
  },
}
