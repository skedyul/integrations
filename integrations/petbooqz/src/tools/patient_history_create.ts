import { z, type ToolDefinition, createSuccessResponse, createExternalError } from 'skedyul'
import { createClientFromEnv } from '../lib/api_client'
import { withPetbooqzApi } from '../lib/booking_queue'
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
  source_report_id: z
    .string()
    .optional()
    .describe('CRM test report ID for idempotent sync (deduplicates on re-run)'),
})

const PatientHistoryCreateOutputSchema = z.object({
  history: PatientHistorySchema,
  already_exists: z.boolean().optional(),
})

type PatientHistoryCreateInput = z.infer<typeof PatientHistoryCreateInputSchema>
type PatientHistoryCreateOutput = z.infer<typeof PatientHistoryCreateOutputSchema>

export function buildPatientHistoryTitle(
  title: string,
  sourceReportId?: string,
): string {
  if (sourceReportId) {
    return `Skedyul Report ${sourceReportId}`
  }
  return title
}

async function findExistingHistoryByTitle(
  apiClient: ReturnType<typeof createClientFromEnv>,
  patientId: string,
  title: string,
): Promise<Record<string, unknown> | undefined> {
  const response = await apiClient.get<Array<Record<string, unknown>> | PetbooqzErrorResponse>(
    `/histories/${patientId}`,
    undefined,
    'Skedyul/v1',
  )

  if (isPetbooqzError(response)) {
    return undefined
  }

  const histories = Array.isArray(response) ? response : [response]
  return histories.find((history) => history.title === title)
}

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
    return withPetbooqzApi(async () => {
      const apiClient = createClientFromEnv(context.env)
      const effectiveTitle = buildPatientHistoryTitle(input.title, input.source_report_id)

      console.log('[patient_history_create] Starting with input:', JSON.stringify({
        title: effectiveTitle,
        client_id: input.client_id,
        patient_id: input.patient_id,
        source_report_id: input.source_report_id,
        notes_length: input.notes?.length ?? 0,
      }))

      try {
        const existing = await findExistingHistoryByTitle(
          apiClient,
          input.patient_id,
          effectiveTitle,
        )

        if (existing) {
          console.log('[patient_history_create] History already exists, skipping create')
          return createSuccessResponse({
            history: {
              title: effectiveTitle,
              client_id: input.client_id,
              patient_id: input.patient_id,
              notes: '[content already synced to Petbooqz]',
              ...existing,
            },
            already_exists: true,
          })
        }

        const response = await apiClient.post<Record<string, unknown> | PetbooqzErrorResponse>(
          '/newHistory',
          {
            title: effectiveTitle,
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
          return createExternalError('Petbooqz', getErrorMessage(response), {
            retry: { allowed: false },
          })
        }

        const result = createSuccessResponse({
          history: {
            title: effectiveTitle,
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
          { retry: { allowed: false } },
        )
      }
    })
  },
}
