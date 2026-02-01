import { z, type ToolDefinition } from 'skedyul'

const PatientHistoryGetInputSchema = z.object({})

const PatientHistoryGetOutputSchema = z.object({})

type PatientHistoryGetInput = z.infer<typeof PatientHistoryGetInputSchema>
type PatientHistoryGetOutput = z.infer<typeof PatientHistoryGetOutputSchema>

export const patientHistoryGetRegistry: ToolDefinition<
  PatientHistoryGetInput,
  PatientHistoryGetOutput
> = {
  name: 'patient_history_get',
  description: 'Get patient history on Petbooqz',
  inputSchema: PatientHistoryGetInputSchema,
  outputSchema: PatientHistoryGetOutputSchema,
  handler: async () => {
    return {
      output: {},
      billing: {
        credits: 0,
      },
    }
  },
}
