"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.patientHistoryGetRegistry = void 0;
const zod_1 = require("zod");
const PatientHistoryGetInputSchema = zod_1.z.object({});
const PatientHistoryGetOutputSchema = zod_1.z.object({});
exports.patientHistoryGetRegistry = {
    name: 'patient_history.get',
    description: 'Get patient history',
    inputs: PatientHistoryGetInputSchema,
    outputSchema: PatientHistoryGetOutputSchema,
    handler: async () => {
        return {
            output: {},
            billing: {
                credits: 0,
            },
        };
    },
};
