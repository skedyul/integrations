import { z } from 'zod'
import type { ToolDefinition } from 'skedyul'
import { PetbooqzApiClient } from '../lib/api-client'

export interface Patient {
  client_id: string
  name: string
  species: string
  breed: string
  date_of_birth: string
  colour_id: string
  is_active: string
}

const PatientsGetInputSchema = z.object({
  patient_id: z.string(),
})

const PatientsGetOutputSchema = z.object({
  patient: z.object({
    client_id: z.string(),
    name: z.string(),
    species: z.string(),
    breed: z.string(),
    date_of_birth: z.string(),
    colour_id: z.string(),
    is_active: z.string(),
  }),
})

type PatientsGetInput = z.infer<typeof PatientsGetInputSchema>
type PatientsGetOutput = z.infer<typeof PatientsGetOutputSchema>

export const patientsGetRegistry: ToolDefinition<
  PatientsGetInput,
  PatientsGetOutput
> = {
  name: 'patients.get',
  description: 'Get patient information by ID on Petbooqz',
  inputs: PatientsGetInputSchema,
  outputSchema: PatientsGetOutputSchema,
  handler: async ({ input, context }) => {
  const baseUrl = context.env.PETBOOQZ_BASE_URL
  const username = context.env.PETBOOQZ_USERNAME
  const password = context.env.PETBOOQZ_PASSWORD

  if (!baseUrl || !username || !password) {
    throw new Error(
      'Missing required environment variables: PETBOOQZ_BASE_URL, PETBOOQZ_USERNAME, PETBOOQZ_PASSWORD',
    )
  }

  const client = new PetbooqzApiClient({ baseUrl, username, password })
  const patient = await client.get<Patient>(`/patients/${input.patient_id}`)

  return {
    output: {
      patient,
    },
    billing: {
      credits: 0,
    },
  }
  },
}

