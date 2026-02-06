import { z, type ToolDefinition } from 'skedyul'
import { createClientFromEnv } from '../lib/api_client'
import { createToolResponse } from '../lib/response'
import { isPetbooqzError, getErrorMessage, type PetbooqzErrorResponse } from '../lib/types'

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
  handler: async (_input, context) => {
    const client = createClientFromEnv(context.env)
    
    try {
      const response = await client.get<
        AppointmentType[] | { appointmentTypes: AppointmentType[] } | PetbooqzErrorResponse
      >('/appointmenttypes')

      console.log('response', response)

      if (isPetbooqzError(response)) {
        return createToolResponse<AppointmentTypesListOutput>('appointment_types_list', {
          success: false,
          error: getErrorMessage(response),
        })
      }

      const appointmentTypes = Array.isArray(response)
        ? response
        : response.appointmentTypes ?? []

      return createToolResponse('appointment_types_list', {
        success: true,
        data: { appointmentTypes },
        message: `Found ${appointmentTypes.length} appointment type${appointmentTypes.length !== 1 ? 's' : ''}`,
      })
    } catch (error) {
      return createToolResponse<AppointmentTypesListOutput>('appointment_types_list', {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list appointment types',
      })
    }
  },
}
