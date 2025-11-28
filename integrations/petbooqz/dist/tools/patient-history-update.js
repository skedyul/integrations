"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.patientHistoryUpdateRegistry = void 0;
const zod_1 = require("zod");
const PatientHistoryUpdateInputSchema = zod_1.z.object({});
const PatientHistoryUpdateOutputSchema = zod_1.z.object({});
exports.patientHistoryUpdateRegistry = {
    name: 'patient_history.update',
    description: 'Update patient history',
    inputs: PatientHistoryUpdateInputSchema,
    outputSchema: PatientHistoryUpdateOutputSchema,
    handler: async () => {
        return {
            output: {},
            billing: {
                credits: 0,
            },
        };
    },
};
