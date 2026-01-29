import { appointmentTypesListRegistry } from './tools/appointment_types_list'
import { calendarSlotsAvailabilityListRegistry } from './tools/calendar_slots_availability_list'
import { calendarSlotsCancelRegistry } from './tools/calendar_slots_cancel'
import { calendarSlotsConfirmRegistry } from './tools/calendar_slots_confirm'
import { calendarSlotsReleaseRegistry } from './tools/calendar_slots_release'
import { calendarSlotsReserveRegistry } from './tools/calendar_slots_reserve'
import { calendarSlotsGetRegistry } from './tools/calendar_slots_get'
import { calendarsListRegistry } from './tools/calendars_list'
import { clientsGetRegistry } from './tools/clients_get'
import { patientHistoryCreateRegistry } from './tools/patient_history_create'
import { patientHistoryGetRegistry } from './tools/patient_history_get'
import { patientHistoryUpdateRegistry } from './tools/patient_history_update'
import { patientsGetRegistry } from './tools/patients_get'
import type { ToolRegistry } from 'skedyul'

export const registry: ToolRegistry = {
  'appointment_types_list': appointmentTypesListRegistry,
  'calendar_slots_availability_list': calendarSlotsAvailabilityListRegistry,
  'calendar_slots_cancel': calendarSlotsCancelRegistry,
  'calendar_slots_confirm': calendarSlotsConfirmRegistry,
  'calendar_slots_release': calendarSlotsReleaseRegistry,
  'calendar_slots_reserve': calendarSlotsReserveRegistry,
  'calendar_slots_get': calendarSlotsGetRegistry,
  'calendars_list': calendarsListRegistry,
  'clients_get': clientsGetRegistry,
  'patient_history_create': patientHistoryCreateRegistry,
  'patient_history_get': patientHistoryGetRegistry,
  'patient_history_update': patientHistoryUpdateRegistry,
  'patients_get': patientsGetRegistry,
}

export type ToolName = keyof typeof registry

export type { ToolContext, ToolHandler } from 'skedyul'
