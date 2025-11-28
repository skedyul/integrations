"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calendarSlotsReserveRegistry = void 0;
const zod_1 = require("zod");
const api_client_1 = require("../lib/api-client");
const CalendarSlotsReserveInputSchema = zod_1.z.object({
    calendar_id: zod_1.z.string(),
    datetime: zod_1.z.string(),
    duration: zod_1.z.string(),
    appointment_note: zod_1.z.string().optional(),
});
const CalendarSlotsReserveOutputSchema = zod_1.z.object({
    slot_id: zod_1.z.number(),
});
exports.calendarSlotsReserveRegistry = {
    name: 'calendar_slots.reserve',
    description: 'Reserve a calendar slot',
    inputs: CalendarSlotsReserveInputSchema,
    outputSchema: CalendarSlotsReserveOutputSchema,
    handler: async ({ input, context }) => {
        const baseUrl = context.env.PETBOOQZ_BASE_URL;
        const username = context.env.PETBOOQZ_USERNAME;
        const password = context.env.PETBOOQZ_PASSWORD;
        if (!baseUrl || !username || !password) {
            throw new Error('Missing required environment variables: PETBOOQZ_BASE_URL, PETBOOQZ_USERNAME, PETBOOQZ_PASSWORD');
        }
        const client = new api_client_1.PetbooqzApiClient({ baseUrl, username, password });
        const response = await client.post(`/calendars/${input.calendar_id}/reserve`, {
            datetime: input.datetime,
            duration: input.duration,
            appointment_note: input.appointment_note,
        });
        // API returns array with single object
        const slotId = response[0]?.slot_id;
        if (!slotId) {
            throw new Error('Failed to reserve slot: no slot_id returned');
        }
        return {
            output: {
                slot_id: slotId,
            },
            billing: {
                credits: 0,
            },
        };
    },
};
