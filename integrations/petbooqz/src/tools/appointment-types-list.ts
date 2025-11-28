import { z } from 'zod'
import type { ToolDefinition } from 'skedyul'
import { PetbooqzApiClient } from '../lib/api-client'

export interface AppointmentType {
  id: string
  code: string
  name: string
  duration: string
}

const AppointmentTypesListInputSchema = z.object({})

const AppointmentTypesListOutputSchema = z.object({
  appointmentTypes: z.array(
    z.object({
      id: z.string(),
      code: z.string(),
      name: z.string(),
      duration: z.string(),
    }),
  ),
})

type AppointmentTypesListInput = z.infer<typeof AppointmentTypesListInputSchema>
type AppointmentTypesListOutput = z.infer<typeof AppointmentTypesListOutputSchema>

export const appointmentTypesListRegistry: ToolDefinition<
  AppointmentTypesListInput,
  AppointmentTypesListOutput
> = {
  name: 'appointment_types.list',
  description: 'List all appointment types',
  inputs: AppointmentTypesListInputSchema,
  outputSchema: AppointmentTypesListOutputSchema,
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
  const appointmentTypes = await client.get<AppointmentType[]>('/appointmenttypes')

  return {
    output: {
      appointmentTypes,
    },
    billing: {
      credits: 0,
    },
  }
  },
}

