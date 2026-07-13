import { z, type ToolDefinition } from 'skedyul'
import {
  computeSkewedExpectedMinorUnits,
  createEstimation,
  createMoneyMinorRange,
} from 'skedyul/estimation'

import { createSuccessResponse, createValidationError, createPhoneError } from '../lib/response'
import {
  createMockExternalChunkId,
  isMockOutboundMessagesEnabled,
} from '../lib/mock_outbound'
import { withTwilioAuth } from '../lib/twilio_client'
import {
  countSmsSegments,
  parseCostPerSmsCents,
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
  skippedCount: z.number().int().nonnegative().optional(),
  totalSegmentsLow: z.number().int().nonnegative(),
  totalSegmentsHigh: z.number().int().nonnegative(),
  totalSegmentsExpected: z.number().int().nonnegative().optional(),
  encoding: z.enum(['GSM-7', 'UCS-2', 'mixed']),
  region: z.literal('AU'),
  costCentsLow: z.number().int().nonnegative(),
  costCentsHigh: z.number().int().nonnegative(),
  costCentsExpected: z.number().int().nonnegative().optional(),
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
  externalChunkId: z.string().optional(),
  acceptedCount: z.number().int().nonnegative(),
  rejectedCount: z.number().int().nonnegative().optional(),
})

type MessageBulkSendInput = z.infer<typeof MessageBulkSendInputSchema>
type MessageBulkSendOutput = z.infer<typeof MessageBulkSendOutputSchema>

function buildEstimateBilling(
  input: MessageBulkSendInput,
  pricePerSegmentCents: number,
) {
  if (input.estimateSummary) {
    const {
      costCentsLow,
      costCentsHigh,
      costCentsExpected,
      deliverableCount,
      skippedCount,
      totalSegmentsExpected,
    } = input.estimateSummary

    const minorUnitsExpected =
      costCentsExpected ??
      (totalSegmentsExpected !== undefined
        ? segmentsToCostCents(totalSegmentsExpected, pricePerSegmentCents)
        : computeSkewedExpectedMinorUnits({
            currency: 'AUD',
            minorUnitsLow: costCentsLow,
            minorUnitsHigh: costCentsHigh,
          }))

    const cost = createMoneyMinorRange({
      currency: 'AUD',
      minorUnitsLow: costCentsLow,
      minorUnitsHigh: costCentsHigh,
      minorUnitsExpected,
    })

    return {
      billing: {
        costCentsLow,
        costCentsHigh,
        costCentsExpected: minorUnitsExpected,
        currency: 'AUD',
        deliverableCount,
        ...(skippedCount !== undefined ? { skippedCount } : {}),
        estimation: createEstimation({
          deliverableCount,
          ...(skippedCount !== undefined ? { skippedCount } : {}),
          cost,
        }),
      },
      acceptedCount: deliverableCount,
    }
  }

  const segmentCounts = input.recipients.map(
    (recipient) => countSmsSegments(recipient.renderedBody).segments,
  )
  const totalSegments = segmentCounts.reduce((sum, value) => sum + value, 0)
  const costCents = segmentsToCostCents(totalSegments, pricePerSegmentCents)

  const cost = createMoneyMinorRange({
    currency: 'AUD',
    minorUnitsLow: costCents,
    minorUnitsHigh: costCents,
    minorUnitsExpected: costCents,
  })

  return {
    billing: {
      costCentsLow: costCents,
      costCentsHigh: costCents,
      costCentsExpected: costCents,
      currency: 'AUD',
      deliverableCount: input.recipients.length,
      estimation: createEstimation({
        deliverableCount: input.recipients.length,
        cost,
      }),
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
      const pricePerSegmentCents = parseCostPerSmsCents(context.env.COST_PER_SMS)
      const { billing, acceptedCount } = buildEstimateBilling(input, pricePerSegmentCents)
      return createSuccessResponse(
        {
          status: 'accepted' as const,
          acceptedCount,
        },
        { billing },
      )
    }

    if (isMockOutboundMessagesEnabled(context.env)) {
      return createSuccessResponse(
        {
          status: 'accepted' as const,
          externalChunkId: createMockExternalChunkId(),
          acceptedCount: input.recipients.length,
        },
        { billing: { credits: input.recipients.length } },
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
        // Twilio Bulk Messaging requires a default filter on every template variable.
        text: "{{ body | default: '' }}",
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

        const responseText = await res.text()
        let externalChunkId: string | undefined

        if (responseText.trim()) {
          try {
            const parsed = JSON.parse(responseText) as { operationId?: unknown }
            if (
              typeof parsed.operationId === 'string' &&
              parsed.operationId.length > 0
            ) {
              externalChunkId = parsed.operationId
            }
          } catch {
            // Twilio bulk send should return JSON; leave externalChunkId undefined if not.
          }
        }

        return { externalChunkId, status: res.status }
      })

      return createSuccessResponse(
        {
          status: 'accepted' as const,
          externalChunkId: response.externalChunkId,
          acceptedCount: input.recipients.length,
        },
        { billing: { credits: input.recipients.length } },
      )
    } catch (err) {
      return createPhoneError(err instanceof Error ? err.message : 'Failed to send SMS batch')
    }
  },
}
