import skedyul, {
  type z as ZodType,
  communicationChannel,
  isRuntimeContext,
} from 'skedyul'
import type { ToolDefinition } from 'skedyul'
import twilio from 'twilio'
import {
  createSuccessResponse,
  createValidationError,
  createAuthError,
  createNotFoundError,
  createPhoneError,
  formatToolError,
} from '../lib/response'
import { withInstallationScope } from '../lib/installation_scope'

const { z } = skedyul

/**
 * Re-ingests inbound SMS that Twilio delivered while the receive_sms webhook was
 * failing. Twilio is the only remaining copy of those messages - a failed webhook
 * is never retried, so nothing reached the platform.
 *
 * Capture is idempotent: Core deduplicates on (channel, externalMessageId) and we
 * pass the Twilio MessageSid as remoteId, so re-running over an overlapping window
 * is safe.
 */
const BackfillInboundSmsInputSchema = z.object({
  phone_number: z
    .string()
    .describe('Phone number in E.164 format to backfill inbound messages for'),
  since: z
    .string()
    .describe('ISO 8601 timestamp - only messages sent after this are considered'),
  until: z
    .string()
    .optional()
    .describe('ISO 8601 timestamp - only messages sent before this are considered. Defaults to now.'),
  limit: z
    .number()
    .optional()
    .describe('Maximum number of Twilio messages to read. Defaults to 500.'),
  dry_run: z
    .boolean()
    .optional()
    .describe('When true (the default), report what would be captured without writing.'),
})

const BackfillInboundSmsOutputSchema = z.object({
  status: z.string().describe('Backfill status'),
  phone_number: z.string().describe('Phone number that was backfilled'),
  dry_run: z.boolean().describe('Whether this was a dry run'),
  window_start: z.string().describe('Start of the window that was scanned'),
  window_end: z.string().describe('End of the window that was scanned'),
  found: z.number().describe('Inbound Twilio messages found in the window'),
  captured: z.number().describe('Messages handed to the platform for capture'),
  failed: z.number().describe('Messages that could not be captured'),
  errors: z
    .array(z.string())
    .optional()
    .describe('Capture errors, truncated to the first few'),
})

type BackfillInboundSmsInput = ZodType.infer<typeof BackfillInboundSmsInputSchema>
type BackfillInboundSmsOutput = ZodType.infer<typeof BackfillInboundSmsOutputSchema>

const DEFAULT_LIMIT = 500
const MAX_REPORTED_ERRORS = 5

export const backfillInboundSmsRegistry: ToolDefinition<
  BackfillInboundSmsInput,
  BackfillInboundSmsOutput
> = {
  name: 'backfill_inbound_sms',
  label: 'Backfill Inbound SMS',
  description:
    'Re-ingests inbound SMS from Twilio for a phone number over a time window. Used to recover messages dropped while the receive_sms webhook was failing. Safe to re-run: capture is deduplicated on the Twilio MessageSid.',
  inputSchema: BackfillInboundSmsInputSchema,
  outputSchema: BackfillInboundSmsOutputSchema,
  handler: async (input, context) => {
    if (!isRuntimeContext(context)) {
      return createValidationError('This tool can only be called in a runtime context')
    }

    const { phone_number, since, until, limit, dry_run } = input
    const dryRun = dry_run ?? true

    if (!phone_number) {
      return createValidationError('Missing required field: phone_number')
    }
    if (!since) {
      return createValidationError('Missing required field: since')
    }

    const windowStart = new Date(since)
    if (Number.isNaN(windowStart.getTime())) {
      return createValidationError(`Invalid ISO timestamp for since: ${since}`)
    }

    const windowEnd = until ? new Date(until) : new Date()
    if (Number.isNaN(windowEnd.getTime())) {
      return createValidationError(`Invalid ISO timestamp for until: ${until}`)
    }
    if (windowEnd <= windowStart) {
      return createValidationError('until must be after since')
    }

    const accountSid = context.env.TWILIO_ACCOUNT_SID
    const authToken = context.env.TWILIO_AUTH_TOKEN
    if (!accountSid || !authToken) {
      return createAuthError(
        'Missing Twilio credentials (TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN)',
      )
    }

    const channels = await communicationChannel.list({
      filter: { identifierValue: phone_number },
      limit: 1,
    })

    if (channels.length === 0) {
      return createNotFoundError('Communication channel', phone_number)
    }

    const channel = channels[0]

    let messages
    try {
      messages = await twilio(accountSid, authToken).messages.list({
        to: phone_number,
        dateSentAfter: windowStart,
        dateSentBefore: windowEnd,
        limit: limit ?? DEFAULT_LIMIT,
      })
    } catch (err) {
      console.error('[BackfillInboundSms] Failed to list Twilio messages:', err)
      return createPhoneError(`Failed to list Twilio messages: ${formatToolError(err)}`)
    }

    const inbound = messages.filter((message) => message.direction === 'inbound')

    console.log(
      `[BackfillInboundSms] ${phone_number}: ${inbound.length} inbound message(s) between ${windowStart.toISOString()} and ${windowEnd.toISOString()} (dryRun=${dryRun})`,
    )

    const result = {
      status: dryRun ? 'dry_run' : 'success',
      phone_number,
      dry_run: dryRun,
      window_start: windowStart.toISOString(),
      window_end: windowEnd.toISOString(),
      found: inbound.length,
      captured: 0,
      failed: 0,
    }

    if (dryRun || inbound.length === 0) {
      return createSuccessResponse(result)
    }

    const errors: string[] = []

    // Oldest first so threads read in the order the messages actually arrived.
    const ordered = [...inbound].sort(
      (a, b) => new Date(a.dateSent).getTime() - new Date(b.dateSent).getTime(),
    )

    await withInstallationScope(channel.appInstallationId, async () => {
      for (const message of ordered) {
        try {
          await communicationChannel.receiveMessage({
            communicationChannelId: channel.id,
            from: message.from,
            contact: { identifierValue: message.from },
            message: {
              message: message.body ?? '',
              remoteId: message.sid,
            },
            remoteId: message.sid,
          })
          result.captured += 1
        } catch (err) {
          result.failed += 1
          if (errors.length < MAX_REPORTED_ERRORS) {
            errors.push(`${message.sid}: ${formatToolError(err)}`)
          }
          console.error(
            `[BackfillInboundSms] Failed to capture ${message.sid}:`,
            err,
          )
        }
      }
    })

    console.log(
      `[BackfillInboundSms] ${phone_number}: captured ${result.captured}, failed ${result.failed}`,
    )

    return createSuccessResponse({
      ...result,
      status: result.failed > 0 ? 'partial' : 'success',
      ...(errors.length > 0 ? { errors } : {}),
    })
  },
}
