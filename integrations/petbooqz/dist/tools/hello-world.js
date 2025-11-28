"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.helloWorld = void 0;
// Example tool demonstrating use of inputs and environment variables.
// It reads an optional "name" from input and a "SKEDYUL_ENV" from env.
const helloWorld = async ({ input, context, }) => {
    const name = input.name?.trim() || 'world';
    const environmentName = context.env.SKEDYUL_ENV ?? 'local';
    return {
        message: `Hello, ${name}! This response is coming from the serverless MCP starter.`,
        environmentName,
    };
};
exports.helloWorld = helloWorld;
