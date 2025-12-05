import { z } from 'zod'
import type { ToolDefinition } from 'skedyul'
import { createClientFromEnv } from '../lib/api-client'

export interface Calendar {
  column: string
  name: string
}

const CalendarsListInputSchema = z.object({})

const CalendarsListOutputSchema = z.object({
  calendars: z.array(
    z.object({
      column: z.string(),
      name: z.string(),
    }),
  ),
})

type CalendarsListInput = z.infer<typeof CalendarsListInputSchema>
type CalendarsListOutput = z.infer<typeof CalendarsListOutputSchema>

export const calendarsListRegistry: ToolDefinition<
  CalendarsListInput,
  CalendarsListOutput
> = {
  name: 'calendars.list',
  description: 'List all calendars on Petbooqz',
  inputs: CalendarsListInputSchema,
  outputSchema: CalendarsListOutputSchema,
  handler: async ({ context }) => {

  const client = createClientFromEnv(context.env)
  const calendars = await client.get<Calendar[]>('/calendars')

  return {
    output: {
      calendars,
    },
    billing: {
      credits: 0,
    },
  }
  },
}

