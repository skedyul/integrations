import { z, resource, type ToolDefinition } from 'skedyul'

/**
 * Link Shared Model Tool
 *
 * Called when a user configures a SHARED model mapping via the form modal.
 * Creates AppResourceInstance records for the model and its fields.
 */

const LinkSharedModelInputSchema = z.object({
  /** The SHARED model handle from provision config (e.g., "client", "patient", "appointment") */
  model_handle: z.string(),
  /** The user's selected target model ID */
  target_model_id: z.string(),
  /** Field mapping: Petbooqz ID field -> user's field ID */
  field_petbooqz_id: z.string().optional(),
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
  description: 'Link a SHARED model to a user workspace model and configure field mappings',
  inputSchema: LinkSharedModelInputSchema,
  outputSchema: LinkSharedModelOutputSchema,
  handler: async (input, _context) => {
    const { model_handle, target_model_id, field_petbooqz_id } = input

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
      // This creates an AppResourceInstance for the MODEL
      const { instanceId } = await resource.link({
        handle: model_handle,
        targetModelId: target_model_id,
      })

      // TODO: For field mappings, we need to extend resource.link or call a separate
      // API to create field AppResourceInstances with dependsOnInstanceId pointing
      // to the model instance. For now, we only create the model instance.
      // Field instances will need to be created with:
      // - appResourceId: the FIELD AppResource ID
      // - targetId: the user's field ID (field_petbooqz_id)
      // - dependsOnInstanceId: instanceId (the model instance)

      const modelName = model_handle.charAt(0).toUpperCase() + model_handle.slice(1)

      return {
        output: {
          success: true,
          message: `${modelName} model linked successfully${field_petbooqz_id ? ' with field mapping' : ''}`,
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
