import { z, type ToolDefinition } from 'skedyul'
import { createClientFromEnv } from '../lib/api_client'

const PatientHistoryCreateInputSchema = z.object({
  title: z.string(),
  client_id: z.string(),
  patient_id: z.string(),
  notes: z.string(),
})

const PatientHistoryCreateOutputSchema = z.object({
  history: z.object({
    title: z.string(),
    client_id: z.string(),
    patient_id: z.string(),
    notes: z.string(),
  }).passthrough(),
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
    const historyData = await apiClient.post<PatientHistoryCreateOutput['history']>(
      '/newHistory',
      {
        title: input.title,
        client_id: input.client_id,
        patient_id: input.patient_id,
        notes: input.notes,
      }
    )

    return {
      output: {
        history: historyData,
      },
      billing: {
        credits: 0,
      },
    }
  },
}
