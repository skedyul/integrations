import type { ToolDefinition } from 'skedyul'
import { z, isRuntimeContext, instance } from 'skedyul'
import { removeChannelByIdentifier } from '../lib/remove_messaging_resource'
import {
  createSuccessResponse,
  createValidationError,
  createNotFoundError,
  createMetaError,
} from '../lib/response'

const RemoveInstagramAccountInputSchema = z.object({
  instagram_account_id: z.string().optional(),
  instance_id: z.string().optional(),
})

const RemoveInstagramAccountOutputSchema = z.object({
  status: z.string(),
  message: z.string().optional(),
})

type RemoveInstagramAccountInput = z.infer<typeof RemoveInstagramAccountInputSchema>
type RemoveInstagramAccountOutput = z.infer<typeof RemoveInstagramAccountOutputSchema>

export const removeInstagramAccountRegistry: ToolDefinition<
  RemoveInstagramAccountInput,
  RemoveInstagramAccountOutput
> = {
  name: 'remove_instagram_account',
  label: 'Remove Instagram Account',
  description:
    'Removes an Instagram account from the installation, deleting its channel and subscriptions',
  inputSchema: RemoveInstagramAccountInputSchema,
  outputSchema: RemoveInstagramAccountOutputSchema,
  handler: async (input, context) => {
    if (!isRuntimeContext(context)) {
      return createValidationError('This tool can only be called in a runtime context')
    }

    const instanceId =
      input.instagram_account_id ||
      input.instance_id ||
      context.request.params?.instagram_account_id

    if (!instanceId) {
      return createValidationError(
        'Missing required field: instagram_account_id or instance_id',
      )
    }

    let record: {
      id: string
      instagram_account_id?: string
      username?: string
    } | null = null

    try {
      record = await instance.get('instagram_account', instanceId)
    } catch (err) {
      return createMetaError(
        `Failed to fetch Instagram account: ${err instanceof Error ? err.message : 'Unknown error'}`,
      )
    }

    if (!record?.instagram_account_id) {
      return createNotFoundError('Instagram account', instanceId)
    }

    try {
      await removeChannelByIdentifier(record.instagram_account_id)
    } catch (err) {
      return createMetaError(
        `Failed to delete Instagram channel: ${err instanceof Error ? err.message : 'Unknown error'}`,
      )
    }

    try {
      await instance.delete('instagram_account', instanceId)
    } catch (err) {
      return createMetaError(
        `Failed to delete Instagram account record: ${err instanceof Error ? err.message : 'Unknown error'}`,
      )
    }

    return createSuccessResponse(
      {
        status: 'success',
        message: `Successfully removed Instagram @${record.username ?? record.instagram_account_id}`,
      },
      { effect: { redirect: '/instagram-accounts' } },
    )
  },
}
