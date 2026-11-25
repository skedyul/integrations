import type { ToolDefinition } from 'skedyul'
import {
  AppAuthInvalidError,
  MessageTemplateDeleteInputSchema,
  MessageTemplateDeleteOutputSchema,
  type MessageTemplateDeleteInput,
  type MessageTemplateDeleteOutput,
} from 'skedyul'
import { MetaClient } from '../lib/meta_client'
import { requireMetaAccessToken, requireMetaWabaId } from '../lib/meta_install_env'
import { createAuthError, createMetaError, createSuccessResponse } from '../lib/response'

/**
 * Delete a WhatsApp message template the platform created
 * (capabilities.messaging.templates.delete), once no unsent message uses it.
 * Keeps the account under Meta's template limit.
 */
export const deleteWhatsAppTemplateRegistry: ToolDefinition<
  MessageTemplateDeleteInput,
  MessageTemplateDeleteOutput
> = {
  name: 'delete_whatsapp_template',
  label: 'Delete WhatsApp template',
  ui: {
    title: 'Deleted WhatsApp template',
    activeTitle: 'Deleting WhatsApp template',
  },
  description: 'Delete a WhatsApp message template that is no longer needed',
  inputSchema: MessageTemplateDeleteInputSchema,
  outputSchema: MessageTemplateDeleteOutputSchema,
  handler: async (input, context) => {
    const env = context.env ?? {}
    const META_APP_ID = env.META_APP_ID || process.env.META_APP_ID
    const META_APP_SECRET = env.META_APP_SECRET || process.env.META_APP_SECRET
    const GRAPH_API_VERSION = env.GRAPH_API_VERSION || process.env.GRAPH_API_VERSION
    if (!META_APP_ID || !META_APP_SECRET || !GRAPH_API_VERSION) {
      return createAuthError('META_APP_ID, META_APP_SECRET and GRAPH_API_VERSION must be configured.')
    }

    let accessToken: string
    let wabaId: string
    try {
      accessToken = requireMetaAccessToken(env)
      wabaId = requireMetaWabaId(env)
    } catch (error) {
      return createAuthError(
        error instanceof Error ? error.message : 'Connect a WhatsApp Business account first.',
      )
    }

    const client = new MetaClient(META_APP_ID, META_APP_SECRET, GRAPH_API_VERSION)
    try {
      const result = await client.deleteMessageTemplate(wabaId, accessToken, {
        name: input.name,
        hsmId: input.templateId || undefined,
      })
      return createSuccessResponse<MessageTemplateDeleteOutput>(result)
    } catch (error) {
      if (error instanceof AppAuthInvalidError) throw error
      return createMetaError(error instanceof Error ? error.message : 'Failed to delete template')
    }
  },
}
