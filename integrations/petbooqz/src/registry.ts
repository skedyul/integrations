import { appointmentTypesListRegistry } from './tools/appointment-types-list'
import { calendarSlotsAvailabilityListRegistry } from './tools/calendar-slots-availability-list'
import { calendarSlotsCancelRegistry } from './tools/calendar-slots-cancel'
import { calendarSlotsConfirmRegistry } from './tools/calendar-slots-confirm'
import { calendarSlotsReleaseRegistry } from './tools/calendar-slots-release'
import { calendarSlotsReserveRegistry } from './tools/calendar-slots-reserve'
import { calendarSlotsGetRegistry } from './tools/calendar-slots-get'
import { calendarsListRegistry } from './tools/calendars-list'
import { clientsGetRegistry } from './tools/clients-get'
import { patientHistoryCreateRegistry } from './tools/patient-history-create'
import { patientHistoryGetRegistry } from './tools/patient-history-get'
import { patientHistoryUpdateRegistry } from './tools/patient-history-update'
import { patientsGetRegistry } from './tools/patients-get'
import type { ToolRegistry } from 'skedyul'

export const registry: ToolRegistry = {
  'appointment_types.list': appointmentTypesListRegistry,
  'calendar_slots.availability.list': calendarSlotsAvailabilityListRegistry,
  'calendar_slots.cancel': calendarSlotsCancelRegistry,
  'calendar_slots.confirm': calendarSlotsConfirmRegistry,
  'calendar_slots.release': calendarSlotsReleaseRegistry,
  'calendar_slots.reserve': calendarSlotsReserveRegistry,
  'calendar_slots.get': calendarSlotsGetRegistry,
  'calendars.list': calendarsListRegistry,
  'clients.get': clientsGetRegistry,
  'patient_history.create': patientHistoryCreateRegistry,
  'patient_history.get': patientHistoryGetRegistry,
  'patient_history.update': patientHistoryUpdateRegistry,
  'patients.get': patientsGetRegistry,
}

export type ToolName = keyof typeof registry

export type { ToolContext, ToolHandler } from 'skedyul'