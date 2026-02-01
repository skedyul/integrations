import { z, type ToolDefinition } from 'skedyul'
import { createClientFromEnv } from '../lib/api_client'

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
  name: 'appointment_types_list',
  description: 'List all appointment types on the Petbooqz calendar',
  inputSchema: AppointmentTypesListInputSchema,
  outputSchema: AppointmentTypesListOutputSchema,
  handler: async (_input, context) => {
    const client = createClientFromEnv(context.env)
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
