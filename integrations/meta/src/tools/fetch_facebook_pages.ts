import type { ToolDefinition } from 'skedyul'
import { z } from 'skedyul'
import { AppAuthInvalidError, isRuntimeContext } from 'skedyul'
import { MetaClient } from '../lib/meta_client'
import {
  requireMetaAccessToken,
} from '../lib/meta_install_env'
import {
  createSuccessResponse,
  createValidationError,
  createMetaError,
} from '../lib/response'

const FetchFacebookPagesInputSchema = z.object({})

const FetchFacebookPagesOutputSchema = z.array(
  z.object({
    id: z.string().describe('Meta Graph API Page ID'),
    name: z.string().describe('Facebook Page name'),
  }),
)

type FetchFacebookPagesInput = z.infer<typeof FetchFacebookPagesInputSchema>
type FetchFacebookPagesOutput = z.infer<typeof FetchFacebookPagesOutputSchema>

/**
 * Fetch Facebook Pages available on the connected Meta account.
 * Used to populate the add-page picker; page_id is stored on the internal
 * facebook_page model when the user adds a page.
 */
export const fetchFacebookPagesRegistry: ToolDefinition<
  FetchFacebookPagesInput,
  FetchFacebookPagesOutput
> = {
  name: 'fetch_facebook_pages',
  label: 'Fetch Facebook Pages',
  description:
    'Lists Facebook Pages from the connected Meta account for provisioning Messenger channels',
  inputSchema: FetchFacebookPagesInputSchema,
  outputSchema: FetchFacebookPagesOutputSchema,
  handler: async (_input, context) => {
    if (!isRuntimeContext(context)) {
      return createValidationError('This tool can only be called in a runtime context')
    }

    const { env } = context
    const META_APP_ID = env.META_APP_ID || process.env.META_APP_ID
    const META_APP_SECRET = env.META_APP_SECRET || process.env.META_APP_SECRET
    const GRAPH_API_VERSION = env.GRAPH_API_VERSION || process.env.GRAPH_API_VERSION

    if (!META_APP_ID || !META_APP_SECRET || !GRAPH_API_VERSION) {
      return createMetaError('Meta app credentials are not configured.')
    }

    let accessToken: string
    try {
      accessToken = requireMetaAccessToken(env)
    } catch {
      return createSuccessResponse([])
    }

    const client = new MetaClient(META_APP_ID, META_APP_SECRET, GRAPH_API_VERSION)

    try {
      const pagesResponse = await client.getPages(accessToken)
      const pages = pagesResponse.data.map((page) => ({
        id: page.id,
        name: page.name,
      }))
      return createSuccessResponse(pages, { billing: { credits: 1 } })
    } catch (error) {
      if (error instanceof AppAuthInvalidError) {
        throw error
      }
      return createMetaError(
        `Failed to fetch Facebook Pages: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  },
}
