import type { InstallHandlerContext, InstallHandlerResult } from 'skedyul'
import {
  MissingRequiredFieldError,
  InvalidConfigurationError,
  AuthenticationError,
} from 'skedyul'
import { PetbooqzApiClient } from '../../lib/api_client'

/**
 * Normalizes a Petbooqz base URL to just the protocol://host:port format.
 *
 * Examples:
 * - "60.240.27.225:36680" → "http://60.240.27.225:36680"
 * - "http://60.240.27.225:36680/" → "http://60.240.27.225:36680"
 * - "http://60.240.27.225:36680/petbooqz/whatever" → "http://60.240.27.225:36680"
 */
function normalizeBaseUrl(url: string): string {
  let normalized = url.trim()

  // Add http:// if no protocol
  if (!normalized.match(/^https?:\/\//)) {
    normalized = `http://${normalized}`
  }

  // Parse to extract just protocol://host:port
  const parsed = new URL(normalized)
  normalized = `${parsed.protocol}//${parsed.host}`

  return normalized
}

/**
 * Install handler for the Petbooqz app.
 *
 * This handler:
 * 1. Normalizes the PETBOOQZ_BASE_URL to just protocol://host:port
 * 2. Verifies credentials by calling the /calendars endpoint
 * 3. Returns the normalized env vars to be persisted
 *
 * @throws Error if credentials are invalid or the API is unreachable
 */
export default async function install(
  ctx: InstallHandlerContext,
): Promise<InstallHandlerResult> {
  const {
    PETBOOQZ_BASE_URL,
    PETBOOQZ_USERNAME,
    PETBOOQZ_PASSWORD,
    PETBOOQZ_API_KEY,
    PETBOOQZ_CLIENT_PRACTICE,
  } = ctx.env

  // Validate required env vars
  if (!PETBOOQZ_BASE_URL) {
    throw new MissingRequiredFieldError('PETBOOQZ_BASE_URL')
  }
  if (!PETBOOQZ_USERNAME) {
    throw new MissingRequiredFieldError('PETBOOQZ_USERNAME')
  }
  if (!PETBOOQZ_PASSWORD) {
    throw new MissingRequiredFieldError('PETBOOQZ_PASSWORD')
  }

  console.log(
    `[Petbooqz Install] Installing for workplace ${ctx.workplace.subdomain}`,
  )
  console.log(`[Petbooqz Install] Original base URL: ${PETBOOQZ_BASE_URL}`)

  // Normalize the base URL
  let normalizedBaseUrl: string
  try {
    normalizedBaseUrl = normalizeBaseUrl(PETBOOQZ_BASE_URL)
  } catch {
    throw new InvalidConfigurationError(
      'PETBOOQZ_BASE_URL',
      `Invalid PETBOOQZ_BASE_URL: ${PETBOOQZ_BASE_URL}. Please enter a valid URL (e.g., 60.240.27.225:36680)`,
    )
  }

  console.log(`[Petbooqz Install] Normalized base URL: ${normalizedBaseUrl}`)

  // Create API client with the normalized URL
  const apiClient = new PetbooqzApiClient({
    rootUrl: normalizedBaseUrl,
    username: PETBOOQZ_USERNAME,
    password: PETBOOQZ_PASSWORD,
    apiKey: PETBOOQZ_API_KEY,
    clientPractice: PETBOOQZ_CLIENT_PRACTICE,
  })

  // Verify credentials by calling the /calendars endpoint
  try {
    const resp = await apiClient.get<unknown>('/calendars')
    console.log('[Petbooqz Install] API response:', JSON.stringify(resp))

    // Validate that we got a proper response - calendars should return an array
    if (resp === undefined || resp === null) {
      throw new AuthenticationError(
        'Failed to verify Petbooqz credentials: Empty response from API. Please check your API URL, username, password, and API key.',
      )
    }

    // Check if the response is an error object (some APIs return 200 with error in body)
    if (typeof resp === 'object' && resp !== null) {
      const respObj = resp as Record<string, unknown>
      if (respObj.error || respObj.Error || respObj.message?.toString().toLowerCase().includes('unauthorized')) {
        throw new AuthenticationError(
          `Failed to verify Petbooqz credentials: ${respObj.error || respObj.Error || respObj.message}. Please check your API URL, username, password, and API key.`,
        )
      }
    }

    // Validate that we got an array of calendars (expected response format)
    if (!Array.isArray(resp)) {
      console.warn('[Petbooqz Install] Unexpected response format (expected array):', typeof resp)
      // Don't throw here, as some configurations might return different formats
    }

    console.log('[Petbooqz Install] Credentials verified successfully')
  } catch (error) {
    // Re-throw AuthenticationError as-is
    if (error instanceof AuthenticationError) {
      throw error
    }
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new AuthenticationError(
      `Failed to verify Petbooqz credentials: ${errorMessage}. Please check your API URL, username, password, and API key.`,
    )
  }

  // Return the normalized env vars to be persisted
  return {
    env: {
      PETBOOQZ_BASE_URL: normalizedBaseUrl,
    },
  }
}
