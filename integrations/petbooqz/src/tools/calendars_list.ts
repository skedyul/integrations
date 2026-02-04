import { z, type ToolDefinition } from 'skedyul'
import { createClientFromEnv } from '../lib/api_client'

export interface Calendar {
  column: string | null
  name: string
}

const CalendarsListInputSchema = z.object({})

const CalendarsListOutputSchema = z.object({
  calendars: z.array(
    z.object({
      column: z.string().nullable(),
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
  name: 'calendars_list',
  label: 'List Calendars',
  description: 'List all calendars on Petbooqz',
  inputSchema: CalendarsListInputSchema,
  outputSchema: CalendarsListOutputSchema,
  handler: async (_input, context) => {
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
