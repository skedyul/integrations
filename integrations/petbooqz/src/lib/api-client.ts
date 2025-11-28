interface ApiClientConfig {
  baseUrl: string
  username: string
  password: string
}

export class PetbooqzApiClient {
  private baseUrl: string
  private authHeader: string

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '') // Remove trailing slash
    const credentials = `${config.username}:${config.password}`
    this.authHeader = `Basic ${Buffer.from(credentials).toString('base64')}`
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.authHeader,
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

