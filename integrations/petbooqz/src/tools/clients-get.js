"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clientsGetRegistry = void 0;
const zod_1 = require("zod");
const api_client_1 = require("../lib/api-client");
const ClientsGetInputSchema = zod_1.z.object({
    client_id: zod_1.z.string(),
});
const ClientsGetOutputSchema = zod_1.z.object({
    client: zod_1.z.object({
        title: zod_1.z.string(),
        first_name: zod_1.z.string(),
        last_name: zod_1.z.string(),
        email_address: zod_1.z.string(),
        mobile_number: zod_1.z.string(),
        landline_number: zod_1.z.string(),
        address_1: zod_1.z.string(),
        city: zod_1.z.string(),
        state: zod_1.z.string(),
        preferred_brance_id: zod_1.z.string(),
        is_active: zod_1.z.string(),
    }),
});
exports.clientsGetRegistry = {
    name: 'clients.get',
    description: 'Get client information by ID',
    inputs: ClientsGetInputSchema,
    outputSchema: ClientsGetOutputSchema,
    handler: async ({ input, context }) => {
        const baseUrl = context.env.PETBOOQZ_BASE_URL;
        const username = context.env.PETBOOQZ_USERNAME;
        const password = context.env.PETBOOQZ_PASSWORD;
        if (!baseUrl || !username || !password) {
            throw new Error('Missing required environment variables: PETBOOQZ_BASE_URL, PETBOOQZ_USERNAME, PETBOOQZ_PASSWORD');
        }
        const client = new api_client_1.PetbooqzApiClient({ baseUrl, username, password });
        const clientData = await client.get(`/clients/${input.client_id}`);
        return {
            output: {
                client: clientData,
            },
            billing: {
                credits: 0,
            },
        };
    },
};
