import skedyul, { isRuntimeContext } from 'skedyul'
import type { ToolDefinition } from 'skedyul'
import {
  MessageSendInputSchema,
  MessageSendOutputSchema,
  type MessageSendInput,
  type MessageSendOutput,
} from 'skedyul'

import { createTwilioClient, withTwilioAuth } from '../lib/twilio_client'

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
      return {
        output: {
          status: 'failed' as const,
          remoteId: undefined,
        },
        billing: {
          credits: 0,
        },
        meta: {
          success: false,
          message: 'Cannot send SMS: subscription.identifierValue (recipient phone number) is empty or missing',
          toolName: 'send_sms',
        },
      }
    }

    // Validate that we have a valid sender phone number
    if (!input.channel.identifierValue?.trim()) {
      return {
        output: {
          status: 'failed' as const,
          remoteId: undefined,
        },
        billing: {
          credits: 0,
        },
        meta: {
          success: false,
          message: 'Cannot send SMS: channel.identifierValue (sender phone number) is empty or missing',
          toolName: 'send_sms',
        },
      }
    }

    const client = createTwilioClient(context.env)

    const message = await withTwilioAuth(() =>
      client.messages.create({
        to: input.subscription.identifierValue,
        from: input.channel.identifierValue,
        body: input.message.content,
      }),
    )

    return {
      output: {
        status: message.status === 'sent' || message.status === 'delivered' ? 'sent' : 'queued',
        remoteId: message.sid,
      },
      billing: {
        credits: 1,
      },
      meta: {
        success: true,
        message: 'SMS sent successfully',
        toolName: 'send_sms',
      },
    }
  },
}
