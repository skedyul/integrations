"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calendarSlotsAvailibilityListRegistry = void 0;
const zod_1 = require("zod");
const api_client_1 = require("../lib/api-client");
const CalendarSlotsAvailibilityListInputSchema = zod_1.z.object({
    calendars: zod_1.z.array(zod_1.z.string()).min(1),
    dates: zod_1.z.array(zod_1.z.string()).min(1),
});
const CalendarSlotsAvailibilityListOutputSchema = zod_1.z.object({
    availableSlots: zod_1.z.array(zod_1.z.object({
        calendar: zod_1.z.string(),
        date: zod_1.z.string(),
        slots: zod_1.z.array(zod_1.z.string()),
    })),
});
exports.calendarSlotsAvailibilityListRegistry = {
    name: 'calendar_slots.availibility.list',
    description: 'List available calendar slots for given calendars and dates',
    inputs: CalendarSlotsAvailibilityListInputSchema,
    outputSchema: CalendarSlotsAvailibilityListOutputSchema,
    handler: async ({ input, context }) => {
        const baseUrl = context.env.PETBOOQZ_BASE_URL;
        const username = context.env.PETBOOQZ_USERNAME;
        const password = context.env.PETBOOQZ_PASSWORD;
        if (!baseUrl || !username || !password) {
            throw new Error('Missing required environment variables: PETBOOQZ_BASE_URL, PETBOOQZ_USERNAME, PETBOOQZ_PASSWORD');
        }
        const client = new api_client_1.PetbooqzApiClient({ baseUrl, username, password });
        const availableSlots = await client.post('/slots', {
            calendars: input.calendars,
            dates: input.dates,
        });
        return {
            output: {
                availableSlots,
            },
            billing: {
                credits: 0,
            },
        };
    },
};
