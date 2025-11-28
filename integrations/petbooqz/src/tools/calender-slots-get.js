"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calenderSlotsGetRegistry = void 0;
const zod_1 = require("zod");
const api_client_1 = require("../lib/api-client");
const CalenderSlotsGetInputSchema = zod_1.z.object({
    calendar_id: zod_1.z.string(),
    slot_id: zod_1.z.string(),
});
const CalenderSlotsGetOutputSchema = zod_1.z.object({
    slot: zod_1.z.object({
        slot_id: zod_1.z.string(),
        datetime: zod_1.z.string(),
        duration: zod_1.z.number(),
        client_id: zod_1.z.string().nullable(),
        patient_id: zod_1.z.string().nullable(),
        email_address: zod_1.z.string().nullable(),
        phone_number: zod_1.z.string().nullable(),
        status: zod_1.z.string().nullable(),
        calendar: zod_1.z.string(),
    }),
});
exports.calenderSlotsGetRegistry = {
    name: 'calender_slots.get',
    description: 'Get calendar slot details',
    inputs: CalenderSlotsGetInputSchema,
    outputSchema: CalenderSlotsGetOutputSchema,
    handler: async ({ input, context }) => {
        const baseUrl = context.env.PETBOOQZ_BASE_URL;
        const username = context.env.PETBOOQZ_USERNAME;
        const password = context.env.PETBOOQZ_PASSWORD;
        if (!baseUrl || !username || !password) {
            throw new Error('Missing required environment variables: PETBOOQZ_BASE_URL, PETBOOQZ_USERNAME, PETBOOQZ_PASSWORD');
        }
        const client = new api_client_1.PetbooqzApiClient({ baseUrl, username, password });
        const slot = await client.get(`/calendars/${input.calendar_id}/check`, { slot_id: input.slot_id });
        return {
            output: {
                slot,
            },
            billing: {
                credits: 0,
            },
        };
    },
};
