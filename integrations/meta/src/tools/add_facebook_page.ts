import type { ToolDefinition } from 'skedyul'
import { z } from 'skedyul'
import { isRuntimeContext } from 'skedyul'
import { instance, communicationChannel } from 'skedyul'
import { MetaClient } from '../lib/meta_client'
import {
  createSuccessResponse,
  createValidationError,
  createAuthError,
  createNotFoundError,
  createMetaError,
} from '../lib/response'

const AddFacebookPageInputSchema = z.object({
  page_id: z.string().describe('Meta Graph API Page ID'),
  name: z.string().optional().describe('Friendly name for the page channel'),
})

const AddFacebookPageOutputSchema = z.object({
  status: z.string(),
  pageId: z.string().optional(),
  message: z.string().optional(),
})

type AddFacebookPageInput = z.infer<typeof AddFacebookPageInputSchema>
type AddFacebookPageOutput = z.infer<typeof AddFacebookPageOutputSchema>

export const addFacebookPageRegistry: ToolDefinition<
  AddFacebookPageInput,
  AddFacebookPageOutput
> = {
  name: 'add_facebook_page',
  label: 'Add Facebook Page',
  description: 'Adds a Facebook Page as a Messenger communication channel',
  inputSchema: AddFacebookPageInputSchema,
  outputSchema: AddFacebookPageOutputSchema,
  handler: async (input, context) => {
    if (!isRuntimeContext(context)) {
      return createValidationError('This tool can only be called in a runtime context')
    }

    const { page_id, name } = input
    const META_APP_ID = context.env.META_APP_ID || process.env.META_APP_ID
    const META_APP_SECRET = context.env.META_APP_SECRET || process.env.META_APP_SECRET
    const GRAPH_API_VERSION = context.env.GRAPH_API_VERSION || process.env.GRAPH_API_VERSION

    if (!META_APP_ID || !META_APP_SECRET || !GRAPH_API_VERSION) {
      return createAuthError('Meta app credentials are not configured.')
    }

    const pages = await instance.list('facebook_page', {
      filter: { page_id },
      limit: 1,
    })

    if (pages.data.length === 0) {
      return createNotFoundError('Facebook page', page_id)
    }

    const page = pages.data[0] as {
      id: string
      name?: string
      access_token?: string | null
    }

    const existingChannels = await communicationChannel.list({
      filter: { identifierValue: page_id },
      limit: 1,
    })

    if (existingChannels.length > 0) {
      return createValidationError(`Facebook page ${page_id} is already added as a channel`)
    }

    try {
      await communicationChannel.create('messenger', {
        name: name ?? page.name ?? `Messenger ${page_id}`,
        identifierValue: page_id,
      })
    } catch (channelErr) {
      console.error('[AddFacebookPage] Failed to create channel:', channelErr)
      return createMetaError(
        `Failed to create Messenger channel: ${channelErr instanceof Error ? channelErr.message : 'Unknown error'}`,
      )
    }

    if (page.access_token) {
      try {
        const client = new MetaClient(META_APP_ID, META_APP_SECRET, GRAPH_API_VERSION)
        await client.subscribePageToWebhooks(page_id, page.access_token)
      } catch (err) {
        console.warn('[AddFacebookPage] Webhook subscription failed (manual setup may be required):', err)
      }
    }

    return createSuccessResponse(
      {
        status: 'success',
        pageId: page_id,
        message: `Successfully added Facebook Page ${page.name ?? page_id} as Messenger channel`,
      },
      {
        billing: { credits: 1 },
        effect: {
          redirect: `/facebook-pages/${page.id}/overview`,
        },
      },
    )
  },
}
