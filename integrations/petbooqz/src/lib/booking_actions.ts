import type { PetbooqzApiClient } from './api_client'
import { isPetbooqzError, getErrorMessage, type PetbooqzErrorResponse } from './types'

export interface ReserveSlotResponse {
  slot_id: string
}

export interface ConfirmSlotResponse {
  clientid: string
  patientid: string
}

export interface BookingClientDetails {
  client_first: string
  client_last: string
  email_address: string
  phone_number: string
  patient_name: string
  appointment_type: string
  reason?: string
  appointment_note?: string
  client_id?: string
  patient_id?: string
}

export async function releaseSlot(
  client: PetbooqzApiClient,
  calendarId: string,
  slotId: string,
): Promise<void> {
  try {
    await client.delete(`/calendars/${calendarId}/release`, { slot_id: slotId })
  } catch {
    // Best-effort cleanup
  }
}

export async function attemptReserve(
  client: PetbooqzApiClient,
  calendarId: string,
  datetime: string,
  duration: string,
  appointmentNote: string | undefined,
): Promise<{ slotId: string; datetime: string } | { error: string }> {
  const response = await client.post<ReserveSlotResponse[] | ReserveSlotResponse | PetbooqzErrorResponse>(
    `/calendars/${calendarId}/reserve`,
    {
      datetime,
      duration,
      appointment_note: appointmentNote,
    },
  )

  if (isPetbooqzError(response)) {
    return { error: getErrorMessage(response) }
  }

  const slotId = Array.isArray(response) ? response[0]?.slot_id : response.slot_id
  if (!slotId) {
    return { error: 'No slot_id returned from API' }
  }

  return { slotId, datetime }
}

export async function attemptConfirm(
  client: PetbooqzApiClient,
  calendarId: string,
  slotId: string,
  details: BookingClientDetails,
): Promise<{ clientId: string; patientId: string } | { error: string }> {
  const response = await client.post<ConfirmSlotResponse | PetbooqzErrorResponse>(
    `/calendars/${calendarId}/confirm`,
    {
      client_first: details.client_first,
      client_last: details.client_last,
      email_address: details.email_address,
      phone_number: details.phone_number,
      patient_name: details.patient_name,
      appointment_type: details.appointment_type,
      reason: details.reason,
      appointment_note: details.appointment_note,
      client_id: details.client_id,
      patient_id: details.patient_id,
    },
    { slot_id: slotId },
  )

  if (isPetbooqzError(response)) {
    return { error: getErrorMessage(response) }
  }

  return { clientId: response.clientid, patientId: response.patientid }
}

export type ReserveAndConfirmResult =
  | {
      ok: true
      slotId: string
      datetime: string
      clientId: string
      patientId: string
    }
  | { ok: false; error: string }

/**
 * Reserve then immediately confirm a slot. Releases the hold if confirm fails.
 */
export async function reserveAndConfirm(
  client: PetbooqzApiClient,
  calendarId: string,
  datetime: string,
  duration: string,
  details: BookingClientDetails,
  appointmentNote?: string,
): Promise<ReserveAndConfirmResult> {
  const reserveResult = await attemptReserve(
    client,
    calendarId,
    datetime,
    duration,
    appointmentNote ?? details.appointment_note,
  )

  if ('error' in reserveResult) {
    return { ok: false, error: reserveResult.error }
  }

  const { slotId, datetime: reservedDatetime } = reserveResult

  try {
    const confirmResult = await attemptConfirm(client, calendarId, slotId, details)

    if ('error' in confirmResult) {
      await releaseSlot(client, calendarId, slotId)
      return { ok: false, error: confirmResult.error }
    }

    return {
      ok: true,
      slotId,
      datetime: reservedDatetime,
      clientId: confirmResult.clientId,
      patientId: confirmResult.patientId,
    }
  } catch (error) {
    await releaseSlot(client, calendarId, slotId)
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to confirm slot',
    }
  }
}
