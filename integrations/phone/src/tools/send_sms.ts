import skedyul, { isRuntimeContext } from 'skedyul'
import type { ToolDefinition } from 'skedyul'
import {
  MessageSendInputSchema,
  MessageSendOutputSchema,
  type MessageSendInput,
  type MessageSendOutput,
} from 'skedyul'

import { createTwilioClient, withTwilioAuth } from '../lib/twilio_client'
import { createSuccessResponse, createValidationError, createPhoneError } from '../lib/response'

/**
 * Send an SMS message via Twilio.
 * Uses the standardized MessageSendInput/Output schemas for strict tool registry typing.
 */
export const sendSmsRegistry: ToolDefinition<MessageSendInput, MessageSendOutput> = {
  name: 'send_sms',
  label: 'Send SMS',
  description: 'Send an SMS message via Twilio',
  inputSchema: MessageSendInputSchema,
  outputSchema: MessageSendOutputSchema,
  handler: async (input, context) => {
    // Validate that we have a valid recipient phone number
    if (!input.subscription.identifierValue?.trim()) {
      return createValidationError(
        'Cannot send SMS: subscription.identifierValue (recipient phone number) is empty or missing',
      )
    }

    // Validate that we have a valid sender phone number
    if (!input.channel.identifierValue?.trim()) {
      return createValidationError(
        'Cannot send SMS: channel.identifierValue (sender phone number) is empty or missing',
      )
    }

    try {
      const client = createTwilioClient(context.env)

      const message = await withTwilioAuth(() =>
        client.messages.create({
          to: input.subscription.identifierValue,
          from: input.channel.identifierValue,
          body: input.message.content,
        }),
      )

      return createSuccessResponse(
        {
          status: message.status === 'sent' || message.status === 'delivered' ? 'sent' : 'queued',
          remoteId: message.sid,
        },
        { billing: { credits: 1 } },
      )
    } catch (err) {
      return createPhoneError(err instanceof Error ? err.message : 'Failed to send SMS')
    }
  },
}
