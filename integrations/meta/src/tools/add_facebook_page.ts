import type { ToolDefinition } from 'skedyul'
import { z } from 'skedyul'
import { isRuntimeContext } from 'skedyul'
import { instance, communicationChannel } from 'skedyul'
import { MetaClient } from '../lib/meta_client'
import { requireMetaAccessToken } from '../lib/meta_install_env'
import {
  createSuccessResponse,
  createValidationError,
  createAuthError,
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
  description:
    'Stores a Facebook Page on the internal model and creates a Messenger communication channel',
  inputSchema: AddFacebookPageInputSchema,
  outputSchema: AddFacebookPageOutputSchema,
  handler: async (input, context) => {
    if (!isRuntimeContext(context)) {
      return createValidationError('This tool can only be called in a runtime context')
    }

    const { page_id, name } = input
    const { env } = context
    const META_APP_ID = env.META_APP_ID || process.env.META_APP_ID
    const META_APP_SECRET = env.META_APP_SECRET || process.env.META_APP_SECRET
    const GRAPH_API_VERSION = env.GRAPH_API_VERSION || process.env.GRAPH_API_VERSION

    if (!META_APP_ID || !META_APP_SECRET || !GRAPH_API_VERSION) {
      return createAuthError('Meta app credentials are not configured.')
    }

    let accessToken: string
    try {
      accessToken = requireMetaAccessToken(env)
    } catch (error) {
      return createAuthError(
        error instanceof Error ? error.message : 'Please complete the OAuth flow first.',
      )
    }

    const existingChannels = await communicationChannel.list({
      filter: { identifierValue: page_id },
      limit: 1,
    })

    if (existingChannels.length > 0) {
      return createValidationError(`Facebook page ${page_id} is already added as a channel`)
    }

    const client = new MetaClient(META_APP_ID, META_APP_SECRET, GRAPH_API_VERSION)

    let pageFromMeta: { id: string; name: string; access_token?: string }
    try {
      const pagesResponse = await client.getPages(accessToken)
      const match = pagesResponse.data.find((page) => page.id === page_id)
      if (!match) {
        return createValidationError(
          `Facebook page ${page_id} was not found on your connected Meta account`,
        )
      }
      pageFromMeta = match
    } catch (error) {
      return createMetaError(
        `Failed to fetch Facebook Page from Meta: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }

    const existingPages = await instance.list('facebook_page', {
      filter: { page_id },
      limit: 1,
    })

    let pageInstance: { id: string; name?: string }
    const pageRecord = {
      page_id: pageFromMeta.id,
      name: pageFromMeta.name,
    }
    const pageEnv = pageFromMeta.access_token
      ? { ACCESS_TOKEN: pageFromMeta.access_token }
      : undefined

    try {
      if (existingPages.data.length > 0) {
        const existing = existingPages.data[0] as { id: string }
        pageInstance = await instance.update('facebook_page', existing.id, pageRecord, {
          env: pageEnv,
        })
      } else {
        pageInstance = await instance.create('facebook_page', pageRecord, {
          env: pageEnv,
        })
      }
    } catch (err) {
      return createMetaError(
        `Failed to store Facebook Page: ${err instanceof Error ? err.message : 'Unknown error'}`,
      )
    }

    try {
      await communicationChannel.create('messenger', {
        name: name ?? pageFromMeta.name ?? `Messenger ${page_id}`,
        identifierValue: page_id,
      })
    } catch (channelErr) {
      console.error('[AddFacebookPage] Failed to create channel:', channelErr)
      return createMetaError(
        `Failed to create Messenger channel: ${channelErr instanceof Error ? channelErr.message : 'Unknown error'}`,
      )
    }

    if (pageFromMeta.access_token) {
      try {
        await client.subscribePageToWebhooks(page_id, pageFromMeta.access_token)
      } catch (err) {
        console.warn('[AddFacebookPage] Webhook subscription failed (manual setup may be required):', err)
      }
    }

    return createSuccessResponse(
      {
        status: 'success',
        pageId: page_id,
        message: `Successfully added Facebook Page ${pageFromMeta.name} as Messenger channel`,
      },
      {
        billing: { credits: 1 },
        effect: {
          redirect: `/facebook-pages/${pageInstance.id}/overview`,
        },
      },
    )
  },
}
