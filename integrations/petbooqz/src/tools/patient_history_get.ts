import { z, type ToolDefinition } from 'skedyul'
import { createClientFromEnv } from '../lib/api_client'

const PatientHistoryGetInputSchema = z.object({
  patient_id: z.string(),
})

const PatientHistoryGetOutputSchema = z.object({
  histories: z.array(z.object({
    title: z.string(),
    client_id: z.string(),
    patient_id: z.string(),
    notes: z.string(),
  }).passthrough()),
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
    const histories = await apiClient.get<PatientHistoryGetOutput['histories']>(
      `/histories/${input.patient_id}`
    )

    return {
      output: {
        histories: Array.isArray(histories) ? histories : [histories],
      },
      billing: {
        credits: 0,
      },
    }
  },
}
