import type { ToolDefinition } from 'skedyul'
import { z } from 'skedyul'
import { isRuntimeContext } from 'skedyul'
import { instance, communicationChannel } from 'skedyul'
import { MetaClient } from '../lib/meta_client'
import { loadPageAccessToken } from '../lib/inbound_message'
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

async function subscribeLinkedPage(
  env: Record<string, string | undefined>,
  pageId: string | null | undefined,
): Promise<void> {
  if (!pageId) {
    console.warn('[AddInstagramAccount] No linked Facebook Page; DMs will not arrive')
    return
  }
  const appId = env.META_APP_ID || process.env.META_APP_ID
  const appSecret = env.META_APP_SECRET || process.env.META_APP_SECRET
  const graphApiVersion = env.GRAPH_API_VERSION || process.env.GRAPH_API_VERSION
  if (!appId || !appSecret || !graphApiVersion) {
    console.warn('[AddInstagramAccount] Meta app credentials missing; page not subscribed')
    return
  }
  try {
    const accessToken = await loadPageAccessToken(pageId)
    if (!accessToken) {
      console.warn(`[AddInstagramAccount] Page ${pageId} has no access token; not subscribed`)
      return
    }
    const client = new MetaClient(appId, appSecret, graphApiVersion)
    await client.subscribePageToWebhooks(pageId, accessToken)
  } catch (err) {
    console.warn(
      `[AddInstagramAccount] Page ${pageId} webhook subscription failed (manual setup may be required):`,
      err,
    )
  }
}

type AddInstagramAccountInput = z.infer<typeof AddInstagramAccountInputSchema>
type AddInstagramAccountOutput = z.infer<typeof AddInstagramAccountOutputSchema>

export const addInstagramAccountRegistry: ToolDefinition<
  AddInstagramAccountInput,
  AddInstagramAccountOutput
> = {
  name: 'add_instagram_account',
  label: 'Add Instagram Account',
  ui: {
    title: 'Added Instagram account',
    activeTitle: 'Adding Instagram account',
    targetArg: 'name',
  },
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
      facebook_page_id?: string | null
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

    // Instagram DMs are only delivered once the linked Page is subscribed.
    await subscribeLinkedPage(context.env, account.facebook_page_id)

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
