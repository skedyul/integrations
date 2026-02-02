import { z, resource, type ToolDefinition } from 'skedyul'

/**
 * Link Shared Model Tool
 *
 * Called when a user configures a SHARED model mapping via the form modal.
 * Creates AppResourceInstance records for the model and AppField records
 * for each field mapping.
 */

const LinkSharedModelInputSchema = z.object({
  /** The SHARED model handle from provision config (e.g., "client", "patient", "appointment") */
  model_handle: z.string(),
  /** The user's selected target model ID */
  target_model_id: z.string(),
  /** Field mappings: provision field handle -> workspace field ID */
  field_mappings: z.record(z.string(), z.string()).optional(),
})

const LinkSharedModelOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  instanceId: z.string().optional(),
})

type LinkSharedModelInput = z.infer<typeof LinkSharedModelInputSchema>
type LinkSharedModelOutput = z.infer<typeof LinkSharedModelOutputSchema>

export const linkSharedModelRegistry: ToolDefinition<
  LinkSharedModelInput,
  LinkSharedModelOutput
> = {
  name: 'link_shared_model',
  label: 'Link Shared Model',
  description: 'Link a SHARED model to a user workspace model and configure field mappings',
  inputSchema: LinkSharedModelInputSchema,
  outputSchema: LinkSharedModelOutputSchema,
  handler: async (input, _context) => {
    const { model_handle, target_model_id, field_mappings } = input

    if (!model_handle || !target_model_id) {
      return {
        output: {
          success: false,
          message: 'Missing required fields: model_handle and target_model_id',
        },
        billing: { credits: 0 },
      }
    }

    try {
      // Link the SHARED model to the user's model
      // This creates an AppResourceInstance for the MODEL and AppField records
      // for each field mapping
      const { instanceId } = await resource.link({
        handle: model_handle,
        targetModelId: target_model_id,
        fieldMappings: field_mappings,
      })

      const modelName = model_handle.charAt(0).toUpperCase() + model_handle.slice(1)
      const fieldCount = field_mappings ? Object.keys(field_mappings).length : 0

      return {
        output: {
          success: true,
          message: `${modelName} model linked successfully${fieldCount > 0 ? ` with ${fieldCount} field mapping${fieldCount > 1 ? 's' : ''}` : ''}`,
          instanceId,
        },
        billing: { credits: 0 },
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      return {
        output: {
          success: false,
          message: `Failed to link model: ${errorMessage}`,
        },
        billing: { credits: 0 },
      }
    }
  },
}
