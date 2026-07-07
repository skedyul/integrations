import { z, type ToolDefinition, createSuccessResponse, createExternalError } from 'skedyul'
import { PETBOOQZ_API_ONE, PETBOOQZ_API_AVAILABILITY, petbooqzBookingTouchPoints } from '../lib/touch_points'
import { createClientFromEnv } from '../lib/api_client'
import { isPetbooqzError, getErrorMessage, type PetbooqzErrorResponse } from '../lib/types'
import { rethrowRateLimitError } from '../lib/response'

export interface AppointmentType {
  id: string
  code: string
  name: string
  duration: string
}

const AppointmentTypeSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  duration: z.string(),
})

const AppointmentTypesListInputSchema = z.object({})

const AppointmentTypesListOutputSchema = z.object({
  appointmentTypes: z.array(AppointmentTypeSchema),
})

type AppointmentTypesListInput = z.infer<typeof AppointmentTypesListInputSchema>
type AppointmentTypesListOutput = z.infer<typeof AppointmentTypesListOutputSchema>

export const appointmentTypesListRegistry: ToolDefinition<
  AppointmentTypesListInput,
  AppointmentTypesListOutput
> = {
  name: 'appointment_types_list',
  label: 'List Appointment Types',
  description: 'List all appointment types on the Petbooqz calendar',
  inputSchema: AppointmentTypesListInputSchema,
  outputSchema: AppointmentTypesListOutputSchema,
  timeout: 300000,
  queueTouchPoints: PETBOOQZ_API_ONE,
  handler: async (_input, context) => {
    
      const client = createClientFromEnv(context.env)

      try {
        const response = await client.get<
          AppointmentType[] | { appointmentTypes: AppointmentType[] } | PetbooqzErrorResponse
        >('/appointmenttypes')

        console.log('response', response)

        if (isPetbooqzError(response)) {
          return createExternalError('Petbooqz', getErrorMessage(response))
        }

        const appointmentTypes = Array.isArray(response)
          ? response
          : response.appointmentTypes ?? []

        return createSuccessResponse({ appointmentTypes })
      } catch (error) {
        rethrowRateLimitError(error)
        return createExternalError(
          'Petbooqz',
          error instanceof Error ? error.message : 'Failed to list appointment types',
        )
      }
  },
}
