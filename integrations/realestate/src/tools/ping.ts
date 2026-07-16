import { z, type ToolDefinition, createSuccessResponse } from 'skedyul'

const PingInputSchema = z.object({})

const PingOutputSchema = z.object({
  status: z.literal('ok'),
  app: z.literal('realestate'),
})

type PingInput = z.infer<typeof PingInputSchema>
type PingOutput = z.infer<typeof PingOutputSchema>

export const pingRegistry: ToolDefinition<PingInput, PingOutput> = {
  name: 'ping',
  label: 'Ping',
  description: 'Health check for the realestate.com.au integration server',
  inputSchema: PingInputSchema,
  outputSchema: PingOutputSchema,
  handler: async () =>
    createSuccessResponse({
      status: 'ok',
      app: 'realestate',
    }),
}
