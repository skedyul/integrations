import { z, type ToolDefinition, createSuccessResponse, createExternalError } from 'skedyul'
import { createClientFromEnv } from '../lib/api_client'
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
        return createExternalError('Petbooqz', getErrorMessage(response))
      }

      const histories = Array.isArray(response) ? response : [response]

      return createSuccessResponse({
        histories: histories as Array<{
          title: string
          client_id: string
          patient_id: string
          notes: string
        }>,
      })
    } catch (error) {
      return createExternalError(
        'Petbooqz',
        error instanceof Error ? error.message : 'Failed to get patient history',
      )
    }
  },
}
