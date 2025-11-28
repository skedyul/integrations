"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calendarSlotsConfirmRegistry = void 0;
const zod_1 = require("zod");
const api_client_1 = require("../lib/api-client");
const CalendarSlotsConfirmInputSchema = zod_1.z.object({
    calendar_id: zod_1.z.string(),
    slot_id: zod_1.z.string(),
    client_first: zod_1.z.string(),
    client_last: zod_1.z.string(),
    email_address: zod_1.z.string(),
    phone_number: zod_1.z.string(),
    patient_name: zod_1.z.string(),
    appointment_type: zod_1.z.string(),
    appointment_note: zod_1.z.string().optional(),
    client_id: zod_1.z.string().optional(),
    patient_id: zod_1.z.string().optional(),
});
const CalendarSlotsConfirmOutputSchema = zod_1.z.object({
    client_id: zod_1.z.string().nullable(),
    patient_id: zod_1.z.string().nullable(),
});
exports.calendarSlotsConfirmRegistry = {
    name: 'calendar_slots.confirm',
    description: 'Confirm a calendar slot',
    inputs: CalendarSlotsConfirmInputSchema,
    outputSchema: CalendarSlotsConfirmOutputSchema,
    handler: async ({ input, context }) => {
        const baseUrl = context.env.PETBOOQZ_BASE_URL;
        const username = context.env.PETBOOQZ_USERNAME;
        const password = context.env.PETBOOQZ_PASSWORD;
        if (!baseUrl || !username || !password) {
            throw new Error('Missing required environment variables: PETBOOQZ_BASE_URL, PETBOOQZ_USERNAME, PETBOOQZ_PASSWORD');
        }
        const client = new api_client_1.PetbooqzApiClient({ baseUrl, username, password });
        const response = await client.post(`/calendars/${input.calendar_id}/confirm`, {
            client_first: input.client_first,
            client_last: input.client_last,
            email_address: input.email_address,
            phone_number: input.phone_number,
            patient_name: input.patient_name,
            appointment_type: input.appointment_type,
            appointment_note: input.appointment_note,
            client_id: input.client_id,
            patient_id: input.patient_id,
        }, { slot_id: input.slot_id });
        return {
            output: {
                client_id: response.client_id,
                patient_id: response.patient_id,
            },
            billing: {
                credits: 0,
            },
        };
    },
};
