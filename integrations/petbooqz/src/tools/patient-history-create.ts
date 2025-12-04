import { z } from 'zod'
import type { ToolDefinition } from 'skedyul'

const PatientHistoryCreateInputSchema = z.object({})

const PatientHistoryCreateOutputSchema = z.object({})

type PatientHistoryCreateInput = z.infer<typeof PatientHistoryCreateInputSchema>
type PatientHistoryCreateOutput = z.infer<typeof PatientHistoryCreateOutputSchema>

export const patientHistoryCreateRegistry: ToolDefinition<
  PatientHistoryCreateInput,
  PatientHistoryCreateOutput
> = {
  name: 'patient_history.create',
  description: 'Create patient history entry on Petbooqz',
  inputs: PatientHistoryCreateInputSchema,
  outputSchema: PatientHistoryCreateOutputSchema,
  handler: async () => {
  return {
    output: {},
    billing: {
      credits: 0,
    },
  }
  },
}

