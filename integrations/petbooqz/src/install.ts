import type { InstallHandlerContext, InstallHandlerResult } from 'skedyul'
import {
  MissingRequiredFieldError,
  InvalidConfigurationError,
  AuthenticationError,
} from 'skedyul'
import { PetbooqzApiClient } from './lib/api_client'

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
    const resp = await apiClient.get('/calendars')
    console.log('[Petbooqz Install] Credentials verified successfully', resp)
  } catch (error) {
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
