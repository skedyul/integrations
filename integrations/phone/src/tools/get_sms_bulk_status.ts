import { z, type ToolDefinition } from 'skedyul'
import {
  createSuccessResponse,
  createValidationError,
  createPhoneError,
} from '../lib/response'
import {
  isMockBulkOperationId,
  isMockOutboundMessagesEnabled,
} from '../lib/mock_outbound'
import { withTwilioAuth } from '../lib/twilio_client'

const TWILIO_BULK_MESSAGES_URL = 'https://comms.twilio.com/v1/Messages'

const MessageBulkStatusInputSchema = z.object({
  channel: z.object({
    id: z.string(),
    handle: z.string(),
    identifierValue: z.string(),
  }),
  operationId: z.string().min(1),
  addresses: z.array(z.string()).optional(),
})

const MessageBulkStatusMessageSchema = z.object({
  address: z.string(),
  status: z.string(),
  messageId: z.string().optional(),
  errorCode: z.union([z.string(), z.number()]).optional(),
  errorMessage: z.string().optional(),
})

const MessageBulkStatusOutputSchema = z.object({
  operationId: z.string(),
  status: z.string(),
  complete: z.boolean(),
  stats: z
    .object({
      total: z.number().int().nonnegative().optional(),
      recipients: z.number().int().nonnegative().optional(),
      attempts: z.number().int().nonnegative().optional(),
      unaddressable: z.number().int().nonnegative().optional(),
      queued: z.number().int().nonnegative().optional(),
      sent: z.number().int().nonnegative().optional(),
      scheduled: z.number().int().nonnegative().optional(),
      delivered: z.number().int().nonnegative().optional(),
      read: z.number().int().nonnegative().optional(),
      undelivered: z.number().int().nonnegative().optional(),
      failed: z.number().int().nonnegative().optional(),
      canceled: z.number().int().nonnegative().optional(),
    })
    .optional(),
  messages: z.array(MessageBulkStatusMessageSchema),
})

type MessageBulkStatusInput = z.infer<typeof MessageBulkStatusInputSchema>
type MessageBulkStatusOutput = z.infer<typeof MessageBulkStatusOutputSchema>

type TwilioOperationResponse = {
  id?: string
  status?: string
  stats?: MessageBulkStatusOutput['stats']
}

type TwilioBulkMessageRecord = {
  id?: string
  status?: string
  to?:
    | string
    | Array<{
        address?: string
        channel?: string
      }>
  error_code?: string | number | null
  error_message?: string | null
}

function extractAddress(record: TwilioBulkMessageRecord): string | null {
  if (typeof record.to === 'string' && record.to.trim()) {
    return record.to.trim()
  }
  if (Array.isArray(record.to)) {
    const first = record.to.find((entry) => entry.address?.trim())
    return first?.address?.trim() ?? null
  }
  return null
}

async function fetchJson(
  url: string,
  authHeader: string,
): Promise<unknown> {
  const response = await fetch(url, {
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `Twilio Bulk Messaging API error (${response.status}): ${errorText || response.statusText}`,
    )
  }

  return response.json()
}

export const getSmsBulkStatusRegistry: ToolDefinition<
  MessageBulkStatusInput,
  MessageBulkStatusOutput
> = {
  name: 'get_sms_bulk_status',
  label: 'Get SMS Bulk Status',
  description:
    'Fetch Twilio Bulk Messaging operation status and per-recipient message statuses by operationId',
  inputSchema: MessageBulkStatusInputSchema,
  outputSchema: MessageBulkStatusOutputSchema,
  handler: async (input, context) => {
    if (!input.operationId?.trim()) {
      return createValidationError(
        'Cannot get SMS bulk status: operationId is required',
      )
    }

    if (context.mode === 'estimate') {
      return createSuccessResponse(
        {
          operationId: input.operationId,
          status: 'COMPLETED',
          complete: true,
          messages: [],
        },
        { billing: { credits: 0 } },
      )
    }

    if (
      isMockOutboundMessagesEnabled(context.env) ||
      isMockBulkOperationId(input.operationId)
    ) {
      const addresses = input.addresses ?? []
      return createSuccessResponse(
        {
          operationId: input.operationId,
          status: 'COMPLETED',
          complete: true,
          stats: {
            total: addresses.length,
            recipients: addresses.length,
            sent: addresses.length,
            delivered: addresses.length,
            failed: 0,
          },
          messages: addresses.map((address) => ({
            address,
            status: 'SENT',
            messageId: `mock-msg-${address}`,
          })),
        },
        { billing: { credits: 0 } },
      )
    }

    const accountSid = context.env.TWILIO_ACCOUNT_SID as string | undefined
    const authToken = context.env.TWILIO_AUTH_TOKEN as string | undefined

    if (!accountSid || !authToken) {
      return createPhoneError(
        'Missing Twilio credentials: TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN required',
      )
    }

    const authHeader = `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`
    const operationId = input.operationId.trim()

    try {
      const result = await withTwilioAuth(async () => {
        const operation = (await fetchJson(
          `${TWILIO_BULK_MESSAGES_URL}/Operations/${encodeURIComponent(operationId)}`,
          authHeader,
        )) as TwilioOperationResponse

        const messages: MessageBulkStatusOutput['messages'] = []
        let pageUrl: string | null =
          `${TWILIO_BULK_MESSAGES_URL}?operation_id=${encodeURIComponent(operationId)}`

        while (pageUrl) {
          const body = (await fetchJson(pageUrl, authHeader)) as {
            messages?: TwilioBulkMessageRecord[]
            pagination?: { next?: string | null }
            meta?: { next_page_url?: string | null }
          }

          for (const record of body.messages ?? []) {
            const address = extractAddress(record)
            if (!address) continue
            messages.push({
              address,
              status: record.status ?? 'unknown',
              messageId: record.id,
              errorCode: record.error_code ?? undefined,
              errorMessage: record.error_message ?? undefined,
            })
          }

          pageUrl =
            body.pagination?.next ?? body.meta?.next_page_url ?? null
        }

        const status = (operation.status ?? 'UNKNOWN').toUpperCase()
        return {
          operationId: operation.id ?? operationId,
          status,
          complete: status === 'COMPLETED',
          stats: operation.stats,
          messages,
        } satisfies MessageBulkStatusOutput
      })

      return createSuccessResponse(result, { billing: { credits: 0 } })
    } catch (err) {
      return createPhoneError(
        err instanceof Error ? err.message : 'Failed to get SMS bulk status',
      )
    }
  },
}
