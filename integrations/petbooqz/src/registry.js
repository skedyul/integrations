"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registry = void 0;
const appointment_types_list_1 = require("./tools/appointment-types-list");
const calendar_slots_availibility_list_1 = require("./tools/calendar-slots-availibility-list");
const calendar_slots_cancel_1 = require("./tools/calendar-slots-cancel");
const calendar_slots_confirm_1 = require("./tools/calendar-slots-confirm");
const calendar_slots_release_1 = require("./tools/calendar-slots-release");
const calendar_slots_reserve_1 = require("./tools/calendar-slots-reserve");
const calender_slots_get_1 = require("./tools/calender-slots-get");
const calenders_list_1 = require("./tools/calenders-list");
const clients_get_1 = require("./tools/clients-get");
const patient_history_create_1 = require("./tools/patient-history-create");
const patient_history_get_1 = require("./tools/patient-history-get");
const patient_history_update_1 = require("./tools/patient-history-update");
const patients_get_1 = require("./tools/patients-get");
exports.registry = {
    'appointment_types.list': appointment_types_list_1.appointmentTypesListRegistry,
    'calendar_slots.availibility.list': calendar_slots_availibility_list_1.calendarSlotsAvailibilityListRegistry,
    'calendar_slots.cancel': calendar_slots_cancel_1.calendarSlotsCancelRegistry,
    'calendar_slots.confirm': calendar_slots_confirm_1.calendarSlotsConfirmRegistry,
    'calendar_slots.release': calendar_slots_release_1.calendarSlotsReleaseRegistry,
    'calendar_slots.reserve': calendar_slots_reserve_1.calendarSlotsReserveRegistry,
    'calender_slots.get': calender_slots_get_1.calenderSlotsGetRegistry,
    'calenders.list': calenders_list_1.calendersListRegistry,
    'clients.get': clients_get_1.clientsGetRegistry,
    'patient_history.create': patient_history_create_1.patientHistoryCreateRegistry,
    'patient_history.get': patient_history_get_1.patientHistoryGetRegistry,
    'patient_history.update': patient_history_update_1.patientHistoryUpdateRegistry,
    'patients.get': patients_get_1.patientsGetRegistry,
};
