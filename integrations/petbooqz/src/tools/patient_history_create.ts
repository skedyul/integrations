import { z, type ToolDefinition, createSuccessResponse, createExternalError } from 'skedyul'
import { createClientFromEnv } from '../lib/api_client'
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

    console.log('[patient_history_create] Starting with input:', JSON.stringify({
      title: input.title,
      client_id: input.client_id,
      patient_id: input.patient_id,
      notes_length: input.notes?.length ?? 0,
    }))

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

      console.log('[patient_history_create] API response:', JSON.stringify(response))

      if (isPetbooqzError(response)) {
        console.log('[patient_history_create] Detected error response')
        return createExternalError('Petbooqz', getErrorMessage(response))
      }

      const result = createSuccessResponse({
        history: {
          title: input.title,
          client_id: input.client_id,
          patient_id: input.patient_id,
          notes: '[content sent to Petbooqz]',
          ...(response && typeof response === 'object' ? response : {}),
        },
      })

      console.log('[patient_history_create] Returning result:', JSON.stringify({
        hasOutput: !!result.output,
        outputKeys: result.output ? Object.keys(result.output) : [],
        success: result.success,
      }))

      return result
    } catch (error) {
      console.error('[patient_history_create] Error:', error instanceof Error ? error.message : String(error))
      return createExternalError(
        'Petbooqz',
        error instanceof Error ? error.message : 'Failed to create patient history',
      )
    }
  },
}
