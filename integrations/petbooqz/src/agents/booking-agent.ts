import { z } from 'zod'
import type { ToolContext } from 'skedyul'
import { PetbooqzApiClient } from '../lib/api-client'
import type { Calendar } from '../tools/calenders-list'
import type { AvailableSlot } from '../tools/calendar-slots-availibility-list'
import type { ReserveSlotResponse } from '../tools/calendar-slots-reserve'
import type { ConfirmSlotResponse } from '../tools/calendar-slots-confirm'

export const BookingAgentInputSchema = z.object({
  /**
   * Optional calendar name or identifier to target a specific calendar.
   * If omitted, the first calendar returned by Petbooqz will be used.
   */
  calendarName: z.string().optional(),
  /**
   * Requested appointment datetime in ISO-8601 format, using the clinic's local time.
   * Example: "2025-12-02T17:00:00".
   */
  datetime: z.string(),
  /**
   * Appointment duration in minutes.
   */
  durationMinutes: z.number().int().positive(),
  /**
   * Client and patient details required to confirm the appointment.
   */
  clientFirst: z.string(),
  clientLast: z.string(),
  emailAddress: z.string(),
  phoneNumber: z.string(),
  patientName: z.string(),
  appointmentType: z.string(),
  appointmentNote: z.string().optional(),
  clientId: z.string().optional(),
  patientId: z.string().optional(),
})

export const BookingAgentOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  calendarName: z.string().optional(),
  requestedTime: z.string().optional(),
  reservedTime: z.string().optional(),
  /**
   * Raw Petbooqz slot identifier.
   */
  slotId: z.number().optional(),
  /**
   * Alternative time chosen when the requested time was unavailable.
   * Represented as "HH:mm" local time for the requested date.
   */
  alternativeTime: z.string().optional(),
  clientId: z.string().nullable().optional(),
  patientId: z.string().nullable().optional(),
})

export type BookingAgentInput = z.infer<typeof BookingAgentInputSchema>
export type BookingAgentOutput = z.infer<typeof BookingAgentOutputSchema>

function createClientFromContext(context: ToolContext): PetbooqzApiClient {
  const baseUrl = context.env.PETBOOQZ_BASE_URL
  const username = context.env.PETBOOQZ_USERNAME
  const password = context.env.PETBOOQZ_PASSWORD

  if (!baseUrl || !username || !password) {
    throw new Error(
      'Missing required environment variables: PETBOOQZ_BASE_URL, PETBOOQZ_USERNAME, PETBOOQZ_PASSWORD',
    )
  }

  return new PetbooqzApiClient({ baseUrl, username, password })
}

function normaliseTimeFragment(datetime: string): string {
  // Expect formats like "YYYY-MM-DDTHH:mm" or "YYYY-MM-DDTHH:mm:ss"
  // Return "HH:mm" for comparison with available slot strings.
  const timeStart = datetime.indexOf('T')
  if (timeStart === -1 || timeStart + 3 >= datetime.length) {
    return datetime
  }

  const hours = datetime.slice(timeStart + 1, timeStart + 3)
  const minutes = datetime.slice(timeStart + 4, timeStart + 6)

  return `${hours}:${minutes}`
}

function pickCalendar(
  calendars: Calendar[],
  calendarName?: string,
): Calendar | null {
  if (calendars.length === 0) {
    return null
  }

  if (!calendarName) {
    return calendars[0] ?? null
  }

  const normalizedTarget = calendarName.trim().toLowerCase()

  const byName = calendars.find(
    (calendar) => calendar.name.toLowerCase() === normalizedTarget,
  )
  if (byName) {
    return byName
  }

  const byColumn = calendars.find(
    (calendar) => calendar.column.toLowerCase() === normalizedTarget,
  )
  if (byColumn) {
    return byColumn
  }

  return calendars[0] ?? null
}

function findDayAvailability(
  availability: AvailableSlot[],
  calendarColumn: string,
  date: string,
): AvailableSlot | null {
  const normalizedCalendar = calendarColumn.toLowerCase()

  const match = availability.find(
    (slot) =>
      slot.calendar.toLowerCase() === normalizedCalendar && slot.date === date,
  )

  return match ?? null
}

export async function bookAppointment(
  input: BookingAgentInput,
  context: ToolContext,
): Promise<BookingAgentOutput> {
  const client = createClientFromContext(context)

  const calendars = await client.get<Calendar[]>('/calendars')

  const selectedCalendar = pickCalendar(calendars, input.calendarName)
  if (!selectedCalendar) {
    return {
      success: false,
      message: 'No calendars are available in Petbooqz.',
    }
  }

  const dateOnly = input.datetime.slice(0, 10)
  const requestedTimeFragment = normaliseTimeFragment(input.datetime)

  const availableSlots = await client.post<AvailableSlot[]>('/slots', {
    calendars: [selectedCalendar.column],
    dates: [dateOnly],
  })

  const dayAvailability = findDayAvailability(
    availableSlots,
    selectedCalendar.column,
    dateOnly,
  )

  const slotsForDay = dayAvailability?.slots ?? []

  if (slotsForDay.length === 0) {
    return {
      success: false,
      message: `No available slots on ${dateOnly} for calendar ${selectedCalendar.name}.`,
      calendarName: selectedCalendar.name,
      requestedTime: input.datetime,
    }
  }

  const exactMatch = slotsForDay.find(
    (slot) => slot.indexOf(requestedTimeFragment) !== -1,
  )

  const chosenSlotTime = exactMatch ?? slotsForDay[0]
  const reservedDatetime = `${dateOnly}T${chosenSlotTime}`

  const reserveResponse = await client.post<ReserveSlotResponse[]>(
    `/calendars/${selectedCalendar.column}/reserve`,
    {
      datetime: reservedDatetime,
      duration: String(input.durationMinutes),
      appointment_note: input.appointmentNote,
    },
  )

  const reservedSlotId = reserveResponse[0]?.slot_id
  if (!reservedSlotId) {
    throw new Error('Failed to reserve slot: no slot_id returned from Petbooqz')
  }

  const confirmResponse = await client.post<ConfirmSlotResponse>(
    `/calendars/${selectedCalendar.column}/confirm`,
    {
      client_first: input.clientFirst,
      client_last: input.clientLast,
      email_address: input.emailAddress,
      phone_number: input.phoneNumber,
      patient_name: input.patientName,
      appointment_type: input.appointmentType,
      appointment_note: input.appointmentNote,
      client_id: input.clientId,
      patient_id: input.patientId,
    },
    { slot_id: String(reservedSlotId) },
  )

  const usedRequestedTime = Boolean(exactMatch)

  const baseMessage = usedRequestedTime
    ? `Booked an appointment at ${reservedDatetime} on calendar ${selectedCalendar.name}.`
    : `The requested time ${requestedTimeFragment} was not available. Reserved ${chosenSlotTime} on ${dateOnly} for calendar ${selectedCalendar.name} instead.`

  return {
    success: true,
    message: baseMessage,
    calendarName: selectedCalendar.name,
    requestedTime: input.datetime,
    reservedTime: reservedDatetime,
    slotId: reservedSlotId,
    alternativeTime: usedRequestedTime ? undefined : chosenSlotTime,
    clientId: confirmResponse.client_id,
    patientId: confirmResponse.patient_id,
  }
}



