import type { ToolDefinition } from 'skedyul'
import { z } from 'skedyul'
import { isRuntimeContext } from 'skedyul'
import { instance, communicationChannel } from 'skedyul'
import {
  createSuccessResponse,
  createValidationError,
  createAuthError,
  createNotFoundError,
  createMetaError,
} from '../lib/response'

const AddInstagramAccountInputSchema = z.object({
  instagram_account_id: z.string().describe('Meta Graph API Instagram Account ID'),
  name: z.string().optional().describe('Friendly name for the Instagram channel'),
})

const AddInstagramAccountOutputSchema = z.object({
  status: z.string(),
  instagramAccountId: z.string().optional(),
  message: z.string().optional(),
})

type AddInstagramAccountInput = z.infer<typeof AddInstagramAccountInputSchema>
type AddInstagramAccountOutput = z.infer<typeof AddInstagramAccountOutputSchema>

export const addInstagramAccountRegistry: ToolDefinition<
  AddInstagramAccountInput,
  AddInstagramAccountOutput
> = {
  name: 'add_instagram_account',
  label: 'Add Instagram Account',
  description: 'Adds an Instagram Business account as a Direct messaging channel',
  inputSchema: AddInstagramAccountInputSchema,
  outputSchema: AddInstagramAccountOutputSchema,
  handler: async (input, context) => {
    if (!isRuntimeContext(context)) {
      return createValidationError('This tool can only be called in a runtime context')
    }

    const { instagram_account_id, name } = input

    const accounts = await instance.list('instagram_account', {
      filter: { instagram_account_id },
      limit: 1,
    })

    if (accounts.data.length === 0) {
      return createNotFoundError('Instagram account', instagram_account_id)
    }

    const account = accounts.data[0] as {
      id: string
      username?: string
      name?: string | null
    }

    const existingChannels = await communicationChannel.list({
      filter: { identifierValue: instagram_account_id },
      limit: 1,
    })

    if (existingChannels.length > 0) {
      return createValidationError(
        `Instagram account ${instagram_account_id} is already added as a channel`,
      )
    }

    try {
      await communicationChannel.create('instagram', {
        name: name ?? account.name ?? `@${account.username ?? instagram_account_id}`,
        identifierValue: instagram_account_id,
      })
    } catch (channelErr) {
      console.error('[AddInstagramAccount] Failed to create channel:', channelErr)
      return createMetaError(
        `Failed to create Instagram channel: ${channelErr instanceof Error ? channelErr.message : 'Unknown error'}`,
      )
    }

    return createSuccessResponse(
      {
        status: 'success',
        instagramAccountId: instagram_account_id,
        message: `Successfully added Instagram @${account.username ?? instagram_account_id} as a channel`,
      },
      {
        billing: { credits: 1 },
        effect: {
          redirect: `/instagram-accounts/${account.id}/overview`,
        },
      },
    )
  },
}
