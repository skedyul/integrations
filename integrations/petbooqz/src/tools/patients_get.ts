import { z } from 'zod'
import type { ToolDefinition } from 'skedyul'
import { createClientFromEnv } from '../lib/api_client'

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
  name: 'patients_get',
  description: 'Get patient information by ID on Petbooqz',
  inputs: PatientsGetInputSchema,
  outputSchema: PatientsGetOutputSchema,
  handler: async ({ input, context }) => {
  const client = createClientFromEnv(context.env)
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
