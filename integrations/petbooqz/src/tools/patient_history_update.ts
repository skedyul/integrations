import { z, type ToolDefinition } from 'skedyul'

const PatientHistoryUpdateInputSchema = z.object({})

const PatientHistoryUpdateOutputSchema = z.object({})

type PatientHistoryUpdateInput = z.infer<typeof PatientHistoryUpdateInputSchema>
type PatientHistoryUpdateOutput = z.infer<typeof PatientHistoryUpdateOutputSchema>

export const patientHistoryUpdateRegistry: ToolDefinition<
  PatientHistoryUpdateInput,
  PatientHistoryUpdateOutput
> = {
  name: 'patient_history_update',
  description: 'Update patient history on Petbooqz',
  inputSchema: PatientHistoryUpdateInputSchema,
  outputSchema: PatientHistoryUpdateOutputSchema,
  handler: async () => {
    return {
      output: {},
      billing: {
        credits: 0,
      },
    }
  },
}
