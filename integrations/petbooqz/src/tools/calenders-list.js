"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calendersListRegistry = void 0;
const zod_1 = require("zod");
const api_client_1 = require("../lib/api-client");
const CalendersListInputSchema = zod_1.z.object({});
const CalendersListOutputSchema = zod_1.z.object({
    calendars: zod_1.z.array(zod_1.z.object({
        column: zod_1.z.string(),
        name: zod_1.z.string(),
    })),
});
exports.calendersListRegistry = {
    name: 'calenders.list',
    description: 'List all calendars',
    inputs: CalendersListInputSchema,
    outputSchema: CalendersListOutputSchema,
    handler: async ({ context }) => {
        const baseUrl = context.env.PETBOOQZ_BASE_URL;
        const username = context.env.PETBOOQZ_USERNAME;
        const password = context.env.PETBOOQZ_PASSWORD;
        if (!baseUrl || !username || !password) {
            throw new Error('Missing required environment variables: PETBOOQZ_BASE_URL, PETBOOQZ_USERNAME, PETBOOQZ_PASSWORD');
        }
        const client = new api_client_1.PetbooqzApiClient({ baseUrl, username, password });
        const calendars = await client.get('/calendars');
        return {
            output: {
                calendars,
            },
            billing: {
                credits: 0,
            },
        };
    },
};
