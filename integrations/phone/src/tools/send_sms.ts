import skedyul, { isRuntimeContext } from 'skedyul'
import type { ToolDefinition } from 'skedyul'
import {
  MessageSendInputSchema,
  MessageSendOutputSchema,
  type MessageSendInput,
  type MessageSendOutput,
} from 'skedyul'

import { createTwilioClient } from '../lib/twilio_client'

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
    const client = createTwilioClient(context.env)

    const message = await client.messages.create({
      to: input.subscription.identifierValue,
      from: input.channel.identifierValue,
      body: input.message.content,
    })

    return {
      output: {
        status: message.status === 'sent' || message.status === 'delivered' ? 'sent' : 'queued',
        remoteId: message.sid,
      },
      billing: {
        credits: 1,
      },
    }
  },
}
