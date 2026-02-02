export interface ApiClientConfig {
  rootUrl: string
  username: string
  password: string
  apiKey?: string
  clientPractice?: string
}

/**
 * Determines which API version to use based on the endpoint path
 * Skedyul/v1: patient histories, clients, patients, asap orders
 * Vetstoria/v2: calendars, slots, appointment types
 */
function getApiVersion(endpoint: string): 'Skedyul/v1' | 'Vetstoria/v2' {
  // Remove query string for pattern matching
  const endpointPath = endpoint.split('?')[0]
  
  // Skedyul/v1 endpoints
  const skedyulEndpoints = [
    '/newHistory',
    '/histories/',
    '/clients/',
    '/patients/',
    '/asap', // asap orders
  ]

  // Check if endpoint matches any Skedyul pattern
  if (skedyulEndpoints.some((pattern) => endpointPath.startsWith(pattern))) {
    return 'Skedyul/v1'
  }

  // Default to Vetstoria/v2 for calendar-related endpoints
  return 'Vetstoria/v2'
}

/**
 * Creates an API client from environment variables
 */
export function createClientFromEnv(env: Record<string, string | undefined>): PetbooqzApiClient {
  const rootUrl = env.PETBOOQZ_BASE_URL
  const username = env.PETBOOQZ_USERNAME
  const password = env.PETBOOQZ_PASSWORD
  const apiKey = env.PETBOOQZ_API_KEY
  const clientPractice = env.PETBOOQZ_CLIENT_PRACTICE

  if (!rootUrl || !username || !password) {
    throw new Error(
      'Missing required environment variables: PETBOOQZ_BASE_URL, PETBOOQZ_USERNAME, PETBOOQZ_PASSWORD',
    )
  }

  return new PetbooqzApiClient({ rootUrl, username, password, apiKey, clientPractice })
}

export class PetbooqzApiClient {
  private rootUrl: string
  private authHeader: string
  private apiKey?: string
  private clientPractice?: string

  constructor(config: ApiClientConfig) {
    this.rootUrl = config.rootUrl.replace(/\/$/, '') // Remove trailing slash
    const credentials = `${config.username}:${config.password}`
    this.authHeader = `Basic ${Buffer.from(credentials).toString('base64')}`
    this.apiKey = config.apiKey
    this.clientPractice = config.clientPractice
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    // Determine API version based on endpoint
    const apiVersion = getApiVersion(endpoint)
    
    // Construct full URL: {rootUrl}/petbooqz/ExternalAPI/{ApiVersion}/{endpoint}
    // Remove leading slash from endpoint if present
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint
    const url = `${this.rootUrl}/petbooqz/ExternalAPI/${apiVersion}/${cleanEndpoint}`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: this.authHeader,
    }

    if (this.apiKey) {
      headers['APIKEY'] = this.apiKey
    }

    if (this.clientPractice) {
      headers['CLIENT_PRACTICE'] = this.clientPractice
    }

    // Debug logging
    if (process.env.DEBUG_PETBOOQZ === 'true') {
      console.error(`[DEBUG] ${options.method || 'GET'} ${url}`)
      console.error(`[DEBUG] Headers: Authorization: Basic *****, APIKEY: ${this.apiKey ? '***' : 'NOT SET'}`)
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`,
      )
    }

    // Handle empty responses (e.g., DELETE requests)
    const contentType = response.headers.get('content-type')
    if (
      !contentType ||
      !contentType.includes('application/json') ||
      response.status === 204
    ) {
      return undefined as T
    }

    return response.json() as Promise<T>
  }

  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    let url = endpoint
    if (params) {
      const searchParams = new URLSearchParams(params)
      url = `${endpoint}?${searchParams.toString()}`
    }
    return this.request<T>(url, { method: 'GET' })
  }

  async post<T>(
    endpoint: string,
    data?: unknown,
    params?: Record<string, string>,
  ): Promise<T> {
    let url = endpoint
    if (params) {
      const searchParams = new URLSearchParams(params)
      url = `${endpoint}?${searchParams.toString()}`
    }
    return this.request<T>(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    let url = endpoint
    if (params) {
      const searchParams = new URLSearchParams(params)
      url = `${endpoint}?${searchParams.toString()}`
    }
    return this.request<T>(url, { method: 'DELETE' })
  }
}
