export interface ApiClientConfig {
  baseUrl: string
  username: string
  password: string
  apiKey?: string
  clientPractice?: string
}

/**
 * Creates an API client from environment variables
 */
export function createClientFromEnv(env: Record<string, string | undefined>): PetbooqzApiClient {
  const baseUrl = env.PETBOOQZ_BASE_URL
  const username = env.PETBOOQZ_USERNAME
  const password = env.PETBOOQZ_PASSWORD
  const apiKey = env.PETBOOQZ_API_KEY
  const clientPractice = env.PETBOOQZ_CLIENT_PRACTICE

  if (!baseUrl || !username || !password) {
    throw new Error(
      'Missing required environment variables: PETBOOQZ_BASE_URL, PETBOOQZ_USERNAME, PETBOOQZ_PASSWORD',
    )
  }

  return new PetbooqzApiClient({ baseUrl, username, password, apiKey, clientPractice })
}

export class PetbooqzApiClient {
  private baseUrl: string
  private authHeader: string
  private apiKey?: string
  private clientPractice?: string

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '') // Remove trailing slash
    const credentials = `${config.username}:${config.password}`
    this.authHeader = `Basic ${Buffer.from(credentials).toString('base64')}`
    this.apiKey = config.apiKey
    this.clientPractice = config.clientPractice
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

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
