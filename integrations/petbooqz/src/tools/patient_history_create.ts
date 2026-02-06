import { z, type ToolDefinition } from 'skedyul'
import { createClientFromEnv } from '../lib/api_client'
import { createToolResponse } from '../lib/response'
import { isPetbooqzError, getErrorMessage, type PetbooqzErrorResponse } from '../lib/types'

const PatientHistorySchema = z.object({
  title: z.string(),
  client_id: z.string(),
  patient_id: z.string(),
  notes: z.string(),
}).passthrough()

const PatientHistoryCreateInputSchema = z.object({
  title: z.string(),
  client_id: z.string(),
  patient_id: z.string(),
  notes: z.string(),
})

const PatientHistoryCreateOutputSchema = z.object({
  history: PatientHistorySchema,
})

type PatientHistoryCreateInput = z.infer<typeof PatientHistoryCreateInputSchema>
type PatientHistoryCreateOutput = z.infer<typeof PatientHistoryCreateOutputSchema>

export const patientHistoryCreateRegistry: ToolDefinition<
  PatientHistoryCreateInput,
  PatientHistoryCreateOutput
> = {
  name: 'patient_history_create',
  label: 'Create Patient History',
  description: 'Create patient history entry on Petbooqz',
  inputSchema: PatientHistoryCreateInputSchema,
  outputSchema: PatientHistoryCreateOutputSchema,
  handler: async (input, context) => {
    const apiClient = createClientFromEnv(context.env)
    
    try {
      const response = await apiClient.post<Record<string, unknown> | PetbooqzErrorResponse>(
        '/newHistory',
        {
          title: input.title,
          client_id: input.client_id,
          patient_id: input.patient_id,
          notes: input.notes,
        },
        undefined,
        'Skedyul/v1',
      )

      if (isPetbooqzError(response)) {
        return createToolResponse<PatientHistoryCreateOutput>('patient_history_create', {
          success: false,
          error: getErrorMessage(response),
        })
      }

      return createToolResponse('patient_history_create', {
        success: true,
        data: {
          history: {
            title: input.title,
            client_id: input.client_id,
            patient_id: input.patient_id,
            notes: input.notes,
            ...response,
          },
        },
        message: 'Patient history created',
      })
    } catch (error) {
      return createToolResponse<PatientHistoryCreateOutput>('patient_history_create', {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create patient history',
      })
    }
  },
}
