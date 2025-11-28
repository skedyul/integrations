"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.patientsGetRegistry = void 0;
const zod_1 = require("zod");
const api_client_1 = require("../lib/api-client");
const PatientsGetInputSchema = zod_1.z.object({
    patient_id: zod_1.z.string(),
});
const PatientsGetOutputSchema = zod_1.z.object({
    patient: zod_1.z.object({
        client_id: zod_1.z.string(),
        name: zod_1.z.string(),
        species: zod_1.z.string(),
        breed: zod_1.z.string(),
        date_of_birth: zod_1.z.string(),
        colour_id: zod_1.z.string(),
        is_active: zod_1.z.string(),
    }),
});
exports.patientsGetRegistry = {
    name: 'patients.get',
    description: 'Get patient information by ID',
    inputs: PatientsGetInputSchema,
    outputSchema: PatientsGetOutputSchema,
    handler: async ({ input, context }) => {
        const baseUrl = context.env.PETBOOQZ_BASE_URL;
        const username = context.env.PETBOOQZ_USERNAME;
        const password = context.env.PETBOOQZ_PASSWORD;
        if (!baseUrl || !username || !password) {
            throw new Error('Missing required environment variables: PETBOOQZ_BASE_URL, PETBOOQZ_USERNAME, PETBOOQZ_PASSWORD');
        }
        const client = new api_client_1.PetbooqzApiClient({ baseUrl, username, password });
        const patient = await client.get(`/patients/${input.patient_id}`);
        return {
            output: {
                patient,
            },
            billing: {
                credits: 0,
            },
        };
    },
};
