import { z, type ToolDefinition } from 'skedyul'

import { createSuccessResponse, createValidationError, createPhoneError } from '../lib/response'
import { withTwilioAuth } from '../lib/twilio_client'
import {
  AU_PRICE_PER_SEGMENT_CENTS,
  countSmsSegments,
  segmentsToCostCents,
} from '../lib/sms_segments'

const TWILIO_BULK_MESSAGES_URL = 'https://comms.twilio.com/v1/Messages'
const MAX_RECIPIENTS = 10_000

const MessageBulkRecipientSchema = z.object({
  address: z.string(),
  renderedBody: z.string(),
  instanceId: z.string().optional(),
  threadId: z.string().optional(),
  messageId: z.string().optional(),
  contactId: z.string().optional(),
})

const EstimateSummarySchema = z.object({
  deliverableCount: z.number().int().nonnegative(),
  totalSegmentsLow: z.number().int().nonnegative(),
  totalSegmentsHigh: z.number().int().nonnegative(),
  encoding: z.enum(['GSM-7', 'UCS-2', 'mixed']),
  region: z.literal('AU'),
  costCentsLow: z.number().int().nonnegative(),
  costCentsHigh: z.number().int().nonnegative(),
})

const MessageBulkSendInputSchema = z.object({
  channel: z.object({
    id: z.string(),
    handle: z.string(),
    identifierValue: z.string(),
  }),
  recipients: z.array(MessageBulkRecipientSchema).min(1).max(10000),
  schedule: z.object({ at: z.string() }).optional(),
  estimateSummary: EstimateSummarySchema.optional(),
})

const MessageBulkSendOutputSchema = z.object({
  status: z.enum(['accepted', 'failed']),
  operationId: z.string().optional(),
  acceptedCount: z.number().int().nonnegative(),
  rejectedCount: z.number().int().nonnegative().optional(),
})

type MessageBulkSendInput = z.infer<typeof MessageBulkSendInputSchema>
type MessageBulkSendOutput = z.infer<typeof MessageBulkSendOutputSchema>

function buildEstimateBilling(input: MessageBulkSendInput) {
  if (input.estimateSummary) {
    const { costCentsLow, costCentsHigh, deliverableCount } = input.estimateSummary
    return {
      billing: {
        costCentsLow,
        costCentsHigh,
        currency: 'AUD',
      },
      acceptedCount: deliverableCount,
    }
  }

  const segmentCounts = input.recipients.map(
    (recipient) => countSmsSegments(recipient.renderedBody).segments,
  )
  const totalSegments = segmentCounts.reduce((sum, value) => sum + value, 0)
  const costCents = segmentsToCostCents(totalSegments, AU_PRICE_PER_SEGMENT_CENTS)

  return {
    billing: {
      costCentsLow: costCents,
      costCentsHigh: costCents,
      currency: 'AUD',
    },
    acceptedCount: input.recipients.length,
  }
}

export const sendSmsBatchRegistry: ToolDefinition<
  MessageBulkSendInput,
  MessageBulkSendOutput
> = {
  name: 'send_sms_batch',
  label: 'Send SMS Batch',
  description: 'Send pre-rendered SMS messages to multiple recipients via Twilio Bulk Messaging API',
  inputSchema: MessageBulkSendInputSchema,
  outputSchema: MessageBulkSendOutputSchema,
  handler: async (input, context) => {
    if (!input.channel.identifierValue?.trim()) {
      return createValidationError(
        'Cannot send SMS batch: channel.identifierValue (sender phone number) is empty or missing',
      )
    }

    if (input.recipients.length === 0) {
      return createValidationError('Cannot send SMS batch: recipients array is empty')
    }

    if (input.recipients.length > MAX_RECIPIENTS) {
      return createValidationError(
        `Cannot send SMS batch: maximum ${MAX_RECIPIENTS} recipients per request`,
      )
    }

    const invalidRecipient = input.recipients.find(
      (r) => !r.address?.trim() || !r.renderedBody?.trim(),
    )
    if (invalidRecipient) {
      return createValidationError(
        'Cannot send SMS batch: each recipient must have a non-empty address and renderedBody',
      )
    }

    if (context.mode === 'estimate') {
      const { billing, acceptedCount } = buildEstimateBilling(input)
      return createSuccessResponse(
        {
          status: 'accepted' as const,
          acceptedCount,
        },
        { billing },
      )
    }

    const accountSid = context.env.TWILIO_ACCOUNT_SID as string | undefined
    const authToken = context.env.TWILIO_AUTH_TOKEN as string | undefined

    if (!accountSid || !authToken) {
      return createPhoneError(
        'Missing Twilio credentials: TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN required',
      )
    }

    const body: Record<string, unknown> = {
      from: {
        address: input.channel.identifierValue.trim(),
        channel: 'SMS',
      },
      content: {
        text: '{{ body }}',
      },
      to: input.recipients.map((recipient) => ({
        address: recipient.address.trim(),
        channel: 'PHONE',
        variables: {
          body: recipient.renderedBody,
        },
      })),
    }

    if (input.schedule?.at) {
      body.schedule = {
        expressions: [input.schedule.at],
      }
    }

    try {
      const response = await withTwilioAuth(async () => {
        const res = await fetch(TWILIO_BULK_MESSAGES_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          },
          body: JSON.stringify(body),
        })

        if (!res.ok) {
          const errorText = await res.text()
          throw new Error(
            `Twilio Bulk Messaging API error (${res.status}): ${errorText || res.statusText}`,
          )
        }

        const operationId =
          res.headers.get('operationid') ??
          res.headers.get('operationId') ??
          res.headers.get('OperationId') ??
          undefined

        return { operationId, status: res.status }
      })

      return createSuccessResponse(
        {
          status: 'accepted' as const,
          operationId: response.operationId,
          acceptedCount: input.recipients.length,
        },
        { billing: { credits: input.recipients.length } },
      )
    } catch (err) {
      return createPhoneError(err instanceof Error ? err.message : 'Failed to send SMS batch')
    }
  },
}
