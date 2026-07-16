import type { ToolDefinition } from 'skedyul'
import { z, isRuntimeContext, instance } from 'skedyul'
import { removeChannelByIdentifier } from '../lib/remove_messaging_resource'
import {
  createSuccessResponse,
  createValidationError,
  createNotFoundError,
  createMetaError,
} from '../lib/response'

const RemoveFacebookPageInputSchema = z.object({
  facebook_page_id: z.string().optional(),
  instance_id: z.string().optional(),
})

const RemoveFacebookPageOutputSchema = z.object({
  status: z.string(),
  message: z.string().optional(),
})

type RemoveFacebookPageInput = z.infer<typeof RemoveFacebookPageInputSchema>
type RemoveFacebookPageOutput = z.infer<typeof RemoveFacebookPageOutputSchema>

export const removeFacebookPageRegistry: ToolDefinition<
  RemoveFacebookPageInput,
  RemoveFacebookPageOutput
> = {
  name: 'remove_facebook_page',
  label: 'Remove Facebook Page',
  description:
    'Removes a Facebook Page from the installation, deleting its Messenger channel and subscriptions',
  inputSchema: RemoveFacebookPageInputSchema,
  outputSchema: RemoveFacebookPageOutputSchema,
  handler: async (input, context) => {
    if (!isRuntimeContext(context)) {
      return createValidationError('This tool can only be called in a runtime context')
    }

    const instanceId =
      input.facebook_page_id ||
      input.instance_id ||
      context.request.params?.facebook_page_id

    if (!instanceId) {
      return createValidationError(
        'Missing required field: facebook_page_id or instance_id',
      )
    }

    let record: { id: string; page_id?: string; name?: string } | null = null
    try {
      record = await instance.get('facebook_page', instanceId)
    } catch (err) {
      return createMetaError(
        `Failed to fetch Facebook page: ${err instanceof Error ? err.message : 'Unknown error'}`,
      )
    }

    if (!record?.page_id) {
      return createNotFoundError('Facebook page', instanceId)
    }

    try {
      await removeChannelByIdentifier(record.page_id)
    } catch (err) {
      return createMetaError(
        `Failed to delete Messenger channel: ${err instanceof Error ? err.message : 'Unknown error'}`,
      )
    }

    try {
      await instance.delete('facebook_page', instanceId)
    } catch (err) {
      return createMetaError(
        `Failed to delete Facebook page record: ${err instanceof Error ? err.message : 'Unknown error'}`,
      )
    }

    return createSuccessResponse(
      {
        status: 'success',
        message: `Successfully removed Facebook Page ${record.name ?? record.page_id}`,
      },
      { effect: { redirect: '/facebook-pages' } },
    )
  },
}
