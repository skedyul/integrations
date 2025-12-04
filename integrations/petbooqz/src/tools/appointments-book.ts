import { z } from 'zod'
import type { ToolDefinition } from 'skedyul'
import {
  BookingAgentInputSchema,
  BookingAgentOutputSchema,
  type BookingAgentInput,
  type BookingAgentOutput,
  bookAppointment,
} from '../agents/booking-agent'

export type AppointmentsBookInput = BookingAgentInput
export type AppointmentsBookOutput = BookingAgentOutput

export const appointmentsBookRegistry: ToolDefinition<
  AppointmentsBookInput,
  AppointmentsBookOutput
> = {
  name: 'appointments.book',
  description:
    'Book an appointment in Petbooqz by finding an available slot and confirming it.',
  inputs: BookingAgentInputSchema,
  outputSchema: BookingAgentOutputSchema,
  handler: async ({ input, context }) => {
    const output = await bookAppointment(input, context)

    return {
      output,
      billing: {
        credits: 0,
      },
    }
  },
}



