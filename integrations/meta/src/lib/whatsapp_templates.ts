/**
 * WhatsApp message templates: request bodies and webhook mapping.
 * Pure functions so they can be tested without the network.
 */

export type TemplateParameter = { name: string; example: string }

export type CreateTemplateInput = {
  name: string
  language: string
  category: 'utility' | 'marketing'
  body: string
  parameters?: TemplateParameter[]
  footer?: string
}

/** `POST /{waba-id}/message_templates` body. Named variables (`{{first_name}}`). */
export function buildCreateTemplateBody(input: CreateTemplateInput): Record<string, unknown> {
  const parameters = input.parameters ?? []
  const bodyComponent: Record<string, unknown> = { type: 'BODY', text: input.body }
  if (parameters.length > 0) {
    bodyComponent.example = {
      body_text_named_params: parameters.map((p) => ({
        param_name: p.name,
        example: p.example,
      })),
    }
  }
  const components: Array<Record<string, unknown>> = [bodyComponent]
  if (input.footer?.trim()) {
    components.push({ type: 'FOOTER', text: input.footer.trim() })
  }
  return {
    name: input.name,
    language: input.language,
    category: input.category === 'marketing' ? 'MARKETING' : 'UTILITY',
    ...(parameters.length > 0 ? { parameter_format: 'NAMED' } : {}),
    components,
  }
}

export type SendTemplateInput = {
  name: string
  language: string
  parameters?: Record<string, string>
}

/** `template` object for a `type: "template"` message. */
export function buildTemplateMessage(input: SendTemplateInput): Record<string, unknown> {
  const entries = Object.entries(input.parameters ?? {})
  return {
    name: input.name,
    language: { code: input.language },
    ...(entries.length > 0
      ? {
          components: [
            {
              type: 'body',
              parameters: entries.map(([name, text]) => ({
                type: 'text',
                parameter_name: name,
                text,
              })),
            },
          ],
        }
      : {}),
  }
}

export type PlatformTemplateStatus = 'pending' | 'approved' | 'rejected' | 'paused' | 'disabled'

/** Meta's template review status (create response or webhook `event`) in platform terms. */
export function mapMetaTemplateStatus(status: string | undefined): PlatformTemplateStatus | null {
  switch ((status ?? '').toUpperCase()) {
    case 'PENDING':
    case 'IN_APPEAL':
      return 'pending'
    case 'APPROVED':
    case 'REINSTATED':
      return 'approved'
    case 'REJECTED':
      return 'rejected'
    case 'PAUSED':
    case 'FLAGGED':
      return 'paused'
    case 'DISABLED':
      return 'disabled'
    default:
      return null
  }
}

export function mapMetaTemplateCategory(
  category: string | undefined,
): 'utility' | 'marketing' | undefined {
  const value = (category ?? '').toUpperCase()
  if (value === 'UTILITY') return 'utility'
  if (value === 'MARKETING') return 'marketing'
  return undefined
}

/** `message_template_status_update` webhook value. */
export type MetaTemplateStatusUpdate = {
  event?: string
  message_template_id?: number | string
  message_template_name?: string
  message_template_language?: string
  reason?: string | null
  other_info?: { title?: string; description?: string }
}

export function readTemplateStatusUpdate(value: MetaTemplateStatusUpdate | undefined): {
  templateId: string
  status: PlatformTemplateStatus
  reason?: string
} | null {
  if (!value?.message_template_id) return null
  const status = mapMetaTemplateStatus(value.event)
  if (!status) return null
  const reason =
    value.reason && value.reason !== 'NONE'
      ? value.reason
      : value.other_info?.description || value.other_info?.title || undefined
  return { templateId: String(value.message_template_id), status, ...(reason ? { reason } : {}) }
}
