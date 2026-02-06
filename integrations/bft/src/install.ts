import type { InstallHandlerContext, InstallHandlerResult } from 'skedyul'
import {
  MissingRequiredFieldError,
  InvalidConfigurationError,
} from 'skedyul'

/**
 * Parses the club name from a BFT URL.
 * 
 * Examples:
 * - "https://www.bodyfittraining.au/club/braybrook" → "braybrook"
 * - "https://www.bodyfittraining.au/club/braybrook/" → "braybrook"
 */
function parseClubName(url: string): string {
  const match = url.match(/\/club\/([^\/]+)\/?$/)
  return match ? match[1] : ''
}

/**
 * Install handler for the BFT app.
 *
 * This handler:
 * 1. Validates the BFT_URL is provided
 * 2. Parses the club name from the URL
 * 3. Validates the URL format
 * 4. Returns the parsed club name for reference
 *
 * @throws Error if URL is invalid or club name cannot be parsed
 */
export default async function install(
  ctx: InstallHandlerContext,
): Promise<InstallHandlerResult> {
  const { BFT_URL } = ctx.env

  // Validate required env var
  if (!BFT_URL) {
    throw new MissingRequiredFieldError('BFT_URL')
  }

  console.log(
    `[BFT Install] Installing for workplace ${ctx.workplace.subdomain}`,
  )
  console.log(`[BFT Install] BFT URL: ${BFT_URL}`)

  // Validate URL format
  let parsedUrl: URL
  try {
    parsedUrl = new URL(BFT_URL)
  } catch {
    throw new InvalidConfigurationError(
      'BFT_URL',
      `Invalid BFT_URL: ${BFT_URL}. Please enter a valid URL (e.g., https://www.bodyfittraining.au/club/braybrook)`,
    )
  }

  // Parse club name from URL
  const clubName = parseClubName(BFT_URL)
  if (!clubName) {
    throw new InvalidConfigurationError(
      'BFT_URL',
      `Could not parse club name from URL: ${BFT_URL}. URL should be in format: https://www.bodyfittraining.au/club/{club-name}`,
    )
  }

  console.log(`[BFT Install] Parsed club name: ${clubName}`)

  // Verify the URL is accessible (optional check)
  try {
    const response = await fetch(BFT_URL, { method: 'HEAD' })
    if (!response.ok) {
      console.warn(`[BFT Install] URL returned status ${response.status}, but continuing...`)
    }
  } catch (error) {
    console.warn(`[BFT Install] Could not verify URL accessibility: ${error instanceof Error ? error.message : String(error)}`)
    // Don't throw - URL might be valid but not accessible during install
  }

  // Return the URL as-is (club name will be parsed in tools when needed)
  return {
    env: {
      BFT_URL,
    },
  }
}
