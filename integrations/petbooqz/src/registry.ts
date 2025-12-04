import { appointmentTypesListRegistry } from './tools/appointment-types-list'
import { appointmentsBookRegistry } from './tools/appointments-book'
import { calendarSlotsAvailibilityListRegistry } from './tools/calendar-slots-availibility-list'
import { calendarSlotsCancelRegistry } from './tools/calendar-slots-cancel'
import { calendarSlotsConfirmRegistry } from './tools/calendar-slots-confirm'
import { calendarSlotsReleaseRegistry } from './tools/calendar-slots-release'
import { calendarSlotsReserveRegistry } from './tools/calendar-slots-reserve'
import { calenderSlotsGetRegistry } from './tools/calender-slots-get'
import { calendersListRegistry } from './tools/calenders-list'
import { clientsGetRegistry } from './tools/clients-get'
import { patientHistoryCreateRegistry } from './tools/patient-history-create'
import { patientHistoryGetRegistry } from './tools/patient-history-get'
import { patientHistoryUpdateRegistry } from './tools/patient-history-update'
import { patientsGetRegistry } from './tools/patients-get'
import type { ToolRegistry } from 'skedyul'

export const registry: ToolRegistry = {
  'appointment_types.list': appointmentTypesListRegistry,
  'appointments.book': appointmentsBookRegistry,
  'calendar_slots.availibility.list': calendarSlotsAvailibilityListRegistry,
  'calendar_slots.cancel': calendarSlotsCancelRegistry,
  'calendar_slots.confirm': calendarSlotsConfirmRegistry,
  'calendar_slots.release': calendarSlotsReleaseRegistry,
  'calendar_slots.reserve': calendarSlotsReserveRegistry,
  'calender_slots.get': calenderSlotsGetRegistry,
  'calenders.list': calendersListRegistry,
  'clients.get': clientsGetRegistry,
  'patient_history.create': patientHistoryCreateRegistry,
  'patient_history.get': patientHistoryGetRegistry,
  'patient_history.update': patientHistoryUpdateRegistry,
  'patients.get': patientsGetRegistry,
}

export type ToolName = keyof typeof registry

export type { ToolContext, ToolHandler } from 'skedyul'