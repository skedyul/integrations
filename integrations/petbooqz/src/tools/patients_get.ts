import { z, type ToolDefinition, createSuccessResponse, createNotFoundError, createExternalError } from 'skedyul'
import { PETBOOQZ_API_ONE, PETBOOQZ_API_AVAILABILITY, petbooqzBookingTouchPoints } from '../lib/touch_points'
import { createClientFromEnv } from '../lib/api_client'
import { isPetbooqzError, getErrorMessage, type PetbooqzErrorResponse } from '../lib/types'
import { rethrowRateLimitError } from '../lib/response'

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
  timeout: 300000,
  queueTouchPoints: PETBOOQZ_API_ONE,
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
        rethrowRateLimitError(error)
        return createExternalError(
          'Petbooqz',
          error instanceof Error ? error.message : 'Failed to get patient',
        )
      }
  },
}
