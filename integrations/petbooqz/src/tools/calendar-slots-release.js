"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calendarSlotsReleaseRegistry = void 0;
const zod_1 = require("zod");
const api_client_1 = require("../lib/api-client");
const CalendarSlotsReleaseInputSchema = zod_1.z.object({
    calendar_id: zod_1.z.string(),
    slot_id: zod_1.z.string(),
});
const CalendarSlotsReleaseOutputSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
});
exports.calendarSlotsReleaseRegistry = {
    name: 'calendar_slots.release',
    description: 'Release a calendar slot',
    inputs: CalendarSlotsReleaseInputSchema,
    outputSchema: CalendarSlotsReleaseOutputSchema,
    handler: async ({ input, context }) => {
        const baseUrl = context.env.PETBOOQZ_BASE_URL;
        const username = context.env.PETBOOQZ_USERNAME;
        const password = context.env.PETBOOQZ_PASSWORD;
        if (!baseUrl || !username || !password) {
            throw new Error('Missing required environment variables: PETBOOQZ_BASE_URL, PETBOOQZ_USERNAME, PETBOOQZ_PASSWORD');
        }
        const client = new api_client_1.PetbooqzApiClient({ baseUrl, username, password });
        await client.delete(`/calendars/${input.calendar_id}/release`, { slot_id: input.slot_id });
        return {
            output: {
                success: true,
            },
            billing: {
                credits: 0,
            },
        };
    },
};
