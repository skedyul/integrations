import skedyul, { type z as ZodType } from 'skedyul'
import type { ToolDefinition } from 'skedyul'

const { z } = skedyul
import { createTwilioClient } from '../lib/twilio_client'

/**
 * Input schema for sending SMS messages.
 * This tool can be invoked by agents, workflows, or page actions.
 */
const SendSmsInputSchema = z.object({
  to: z.string().describe('Recipient phone number in E.164 format'),
  from: z.string().describe('Sender phone number (must be a Twilio number)'),
  body: z.string().describe('Message content (max 1600 characters)'),
})

const SendSmsOutputSchema = z.object({
  sid: z.string().describe('Twilio message SID'),
  status: z.string().describe('Message status'),
})

type SendSmsInput = ZodType.infer<typeof SendSmsInputSchema>
type SendSmsOutput = ZodType.infer<typeof SendSmsOutputSchema>

export const sendSmsRegistry: ToolDefinition<SendSmsInput, SendSmsOutput> = {
  name: 'send_sms',
  description: 'Send an SMS message via Twilio',
  inputs: SendSmsInputSchema,
  outputSchema: SendSmsOutputSchema,
  handler: async (input, context) => {
    const client = createTwilioClient(context.env)

    const message = await client.messages.create({
      to: input.to,
      from: input.from,
      body: input.body,
    })

    return {
      output: {
        sid: message.sid,
        status: message.status,
      },
      billing: {
        credits: 1,
      },
    }
  },
}
