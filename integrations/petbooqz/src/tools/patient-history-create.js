"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.patientHistoryCreateRegistry = void 0;
const zod_1 = require("zod");
const PatientHistoryCreateInputSchema = zod_1.z.object({});
const PatientHistoryCreateOutputSchema = zod_1.z.object({});
exports.patientHistoryCreateRegistry = {
    name: 'patient_history.create',
    description: 'Create patient history entry',
    inputs: PatientHistoryCreateInputSchema,
    outputSchema: PatientHistoryCreateOutputSchema,
    handler: async () => {
        return {
            output: {},
            billing: {
                credits: 0,
            },
        };
    },
};
