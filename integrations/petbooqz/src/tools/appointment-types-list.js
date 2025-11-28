"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appointmentTypesListRegistry = void 0;
const zod_1 = require("zod");
const api_client_1 = require("../lib/api-client");
const AppointmentTypesListInputSchema = zod_1.z.object({});
const AppointmentTypesListOutputSchema = zod_1.z.object({
    appointmentTypes: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        code: zod_1.z.string(),
        name: zod_1.z.string(),
        duration: zod_1.z.string(),
    })),
});
exports.appointmentTypesListRegistry = {
    name: 'appointment_types.list',
    description: 'List all appointment types',
    inputs: AppointmentTypesListInputSchema,
    outputSchema: AppointmentTypesListOutputSchema,
    handler: async ({ context }) => {
        const baseUrl = context.env.PETBOOQZ_BASE_URL;
        const username = context.env.PETBOOQZ_USERNAME;
        const password = context.env.PETBOOQZ_PASSWORD;
        if (!baseUrl || !username || !password) {
            throw new Error('Missing required environment variables: PETBOOQZ_BASE_URL, PETBOOQZ_USERNAME, PETBOOQZ_PASSWORD');
        }
        const client = new api_client_1.PetbooqzApiClient({ baseUrl, username, password });
        const appointmentTypes = await client.get('/appointmenttypes');
        return {
            output: {
                appointmentTypes,
            },
            billing: {
                credits: 0,
            },
        };
    },
};
