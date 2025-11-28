import { z } from 'zod'
import type { ToolDefinition } from 'skedyul'

const PatientHistoryGetInputSchema = z.object({})

const PatientHistoryGetOutputSchema = z.object({})

type PatientHistoryGetInput = z.infer<typeof PatientHistoryGetInputSchema>
type PatientHistoryGetOutput = z.infer<typeof PatientHistoryGetOutputSchema>

export const patientHistoryGetRegistry: ToolDefinition<
  PatientHistoryGetInput,
  PatientHistoryGetOutput
> = {
  name: 'patient_history.get',
  description: 'Get patient history',
  inputs: PatientHistoryGetInputSchema,
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

