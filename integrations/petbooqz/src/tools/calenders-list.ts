import { z } from 'zod'
import type { ToolDefinition } from 'skedyul'
import { PetbooqzApiClient } from '../lib/api-client'

export interface Calendar {
  column: string
  name: string
}

const CalendersListInputSchema = z.object({})

const CalendersListOutputSchema = z.object({
  calendars: z.array(
    z.object({
      column: z.string(),
      name: z.string(),
    }),
  ),
})

type CalendersListInput = z.infer<typeof CalendersListInputSchema>
type CalendersListOutput = z.infer<typeof CalendersListOutputSchema>

export const calendersListRegistry: ToolDefinition<
  CalendersListInput,
  CalendersListOutput
> = {
  name: 'calenders.list',
  description: 'List all calendars on Petbooqz',
  inputs: CalendersListInputSchema,
  outputSchema: CalendersListOutputSchema,
  handler: async ({ context }) => {
  const baseUrl = context.env.PETBOOQZ_BASE_URL
  const username = context.env.PETBOOQZ_USERNAME
  const password = context.env.PETBOOQZ_PASSWORD

  if (!baseUrl || !username || !password) {
    throw new Error(
      'Missing required environment variables: PETBOOQZ_BASE_URL, PETBOOQZ_USERNAME, PETBOOQZ_PASSWORD',
    )
  }

  const client = new PetbooqzApiClient({ baseUrl, username, password })
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

