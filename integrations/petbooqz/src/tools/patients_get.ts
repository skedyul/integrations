import { z, type ToolDefinition, createSuccessResponse, createNotFoundError, createExternalError } from 'skedyul'
import { createClientFromEnv } from '../lib/api_client'
import { isPetbooqzError, getErrorMessage, type PetbooqzErrorResponse } from '../lib/types'

export interface Patient {
  client_id: string
  name: string
  species: string
  breed: string
  date_of_birth: string
  colour_id: string
  is_active: string
}

const PatientSchema = z.object({
  client_id: z.string(),
  name: z.string(),
  species: z.string(),
  breed: z.string(),
  date_of_birth: z.string(),
  colour_id: z.string(),
  is_active: z.string(),
})

const PatientsGetInputSchema = z.object({
  patient_id: z.string(),
})

const PatientsGetOutputSchema = z.object({
  patient: PatientSchema,
})

type PatientsGetInput = z.infer<typeof PatientsGetInputSchema>
type PatientsGetOutput = z.infer<typeof PatientsGetOutputSchema>

export const patientsGetRegistry: ToolDefinition<
  PatientsGetInput,
  PatientsGetOutput
> = {
  name: 'patients_get',
  label: 'Get Patient',
  description: 'Get patient information by ID on Petbooqz',
  inputSchema: PatientsGetInputSchema,
  outputSchema: PatientsGetOutputSchema,
  handler: async (input, context) => {
    const client = createClientFromEnv(context.env)

    try {
      const response = await client.get<Patient | PetbooqzErrorResponse>(
        `/patients/${input.patient_id}`,
        undefined,
        'Vetstoria/v2',
      )

      if (isPetbooqzError(response)) {
        return createNotFoundError('Patient', input.patient_id)
      }

      return createSuccessResponse({ patient: response })
    } catch (error) {
      return createExternalError(
        'Petbooqz',
        error instanceof Error ? error.message : 'Failed to get patient',
      )
    }
  },
}
