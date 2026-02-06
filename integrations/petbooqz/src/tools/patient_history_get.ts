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

const PatientHistoryGetInputSchema = z.object({
  patient_id: z.string(),
})

const PatientHistoryGetOutputSchema = z.object({
  histories: z.array(PatientHistorySchema),
})

type PatientHistoryGetInput = z.infer<typeof PatientHistoryGetInputSchema>
type PatientHistoryGetOutput = z.infer<typeof PatientHistoryGetOutputSchema>

export const patientHistoryGetRegistry: ToolDefinition<
  PatientHistoryGetInput,
  PatientHistoryGetOutput
> = {
  name: 'patient_history_get',
  label: 'Get Patient History',
  description: 'Get patient history on Petbooqz',
  inputSchema: PatientHistoryGetInputSchema,
  outputSchema: PatientHistoryGetOutputSchema,
  handler: async (input, context) => {
    const apiClient = createClientFromEnv(context.env)
    
    try {
      const response = await apiClient.get<Array<Record<string, unknown>> | PetbooqzErrorResponse>(
        `/histories/${input.patient_id}`,
        undefined,
        'Skedyul/v1',
      )

      if (isPetbooqzError(response)) {
        return createToolResponse<PatientHistoryGetOutput>('patient_history_get', {
          success: false,
          error: getErrorMessage(response),
        })
      }

      const histories = Array.isArray(response) ? response : [response]

      return createToolResponse('patient_history_get', {
        success: true,
        data: {
          histories: histories as Array<{
            title: string
            client_id: string
            patient_id: string
            notes: string
          }>,
        },
        message: `Found ${histories.length} history entr${histories.length !== 1 ? 'ies' : 'y'}`,
      })
    } catch (error) {
      return createToolResponse<PatientHistoryGetOutput>('patient_history_get', {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get patient history',
      })
    }
  },
}
