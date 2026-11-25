import type { ToolDefinition } from 'skedyul'
import {
  AppAuthInvalidError,
  MessageTemplateCreateInputSchema,
  MessageTemplateCreateOutputSchema,
  type MessageTemplateCreateInput,
  type MessageTemplateCreateOutput,
} from 'skedyul'
import { MetaClient } from '../lib/meta_client'
import { requireMetaAccessToken, requireMetaWabaId } from '../lib/meta_install_env'
import { mapMetaTemplateCategory, mapMetaTemplateStatus } from '../lib/whatsapp_templates'
import { createAuthError, createMetaError, createSuccessResponse } from '../lib/response'

/**
 * Submit a WhatsApp message template for review
 * (capabilities.messaging.templates.create). The platform calls this when a
 * message has to go out after the 24-hour window; the review result arrives
 * later through the message_template_status_update webhook.
 */
export const createWhatsAppTemplateRegistry: ToolDefinition<
  MessageTemplateCreateInput,
  MessageTemplateCreateOutput
> = {
  name: 'create_whatsapp_template',
  label: 'Create WhatsApp template',
  ui: {
    title: 'Submitted WhatsApp template',
    activeTitle: 'Submitting WhatsApp template',
  },
  description: 'Submit a WhatsApp message template to Meta for review',
  inputSchema: MessageTemplateCreateInputSchema,
  outputSchema: MessageTemplateCreateOutputSchema,
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
      const created = await client.createMessageTemplate(wabaId, accessToken, {
        name: input.name,
        language: input.language,
        category: input.category,
        body: input.body,
        parameters: input.parameters,
        footer: input.footer,
      })
      const category = mapMetaTemplateCategory(created.category)
      return createSuccessResponse<MessageTemplateCreateOutput>(
        {
          templateId: created.id,
          status: mapMetaTemplateStatus(created.status) ?? 'pending',
          ...(category ? { category } : {}),
        },
        { billing: { credits: 1 } },
      )
    } catch (error) {
      if (error instanceof AppAuthInvalidError) throw error
      return createMetaError(error instanceof Error ? error.message : 'Failed to create template')
    }
  },
}
