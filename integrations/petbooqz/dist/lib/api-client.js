"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PetbooqzApiClient = void 0;
class PetbooqzApiClient {
    constructor(config) {
        this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
        const credentials = `${config.username}:${config.password}`;
        this.authHeader = `Basic ${Buffer.from(credentials).toString('base64')}`;
    }
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                Authorization: this.authHeader,
                ...options.headers,
            },
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API request failed: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
        }
        // Handle empty responses (e.g., DELETE requests)
        const contentType = response.headers.get('content-type');
        if (!contentType ||
            !contentType.includes('application/json') ||
            response.status === 204) {
            return undefined;
        }
        return response.json();
    }
    async get(endpoint, params) {
        let url = endpoint;
        if (params) {
            const searchParams = new URLSearchParams(params);
            url = `${endpoint}?${searchParams.toString()}`;
        }
        return this.request(url, { method: 'GET' });
    }
    async post(endpoint, data, params) {
        let url = endpoint;
        if (params) {
            const searchParams = new URLSearchParams(params);
            url = `${endpoint}?${searchParams.toString()}`;
        }
        return this.request(url, {
            method: 'POST',
            body: data ? JSON.stringify(data) : undefined,
        });
    }
    async delete(endpoint, params) {
        let url = endpoint;
        if (params) {
            const searchParams = new URLSearchParams(params);
            url = `${endpoint}?${searchParams.toString()}`;
        }
        return this.request(url, { method: 'DELETE' });
    }
}
exports.PetbooqzApiClient = PetbooqzApiClient;
