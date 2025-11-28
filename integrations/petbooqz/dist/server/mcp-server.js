"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const skedyul_1 = require("skedyul");
const registry_1 = require("../registry");
const skedyulServer = skedyul_1.server.create({
    computeLayer: 'serverless',
    metadata: {
        name: 'Petbooqz',
        version: '1.0.0',
    },
}, registry_1.registry);
const serverless = skedyulServer;
exports.handler = serverless.handler;
