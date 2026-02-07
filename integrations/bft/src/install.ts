import type { InstallHandlerContext, InstallHandlerResult } from 'skedyul'
import {
  MissingRequiredFieldError,
  InvalidConfigurationError,
} from 'skedyul'
import { discoverHapanaData } from './lib/hapana'
import { syncFromDiscovery } from './lib/sync'

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
 * 1. Validates the BFT_URL is provided and well-formed
 * 2. Parses the club name from the URL
 * 3. Discovers ALL Hapana data by intercepting the page's API calls
 *    (siteID, settings, sessions, packages — one Playwright session)
 * 4. Syncs the captured data into Skedyul models (no re-fetching)
 * 5. Returns BFT_URL and HAPANA_SITE_ID for runtime use
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
  try {
    new URL(BFT_URL)
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

  // Discover ALL Hapana data in one Playwright session
  console.log(`[BFT Install] Discovering Hapana data (siteID, settings, sessions, packages)...`)
  let discovery: Awaited<ReturnType<typeof discoverHapanaData>>
  try {
    discovery = await discoverHapanaData(BFT_URL)
    console.log(`[BFT Install] Discovery complete:`)
    console.log(`  siteID: ${discovery.siteId}`)
    console.log(`  settings: ${discovery.settings?.siteName ?? 'not captured'}`)
    console.log(`  sessions: ${discovery.sessions.length}`)
    console.log(`  packages: ${discovery.packages.length}`)
  } catch (error) {
    throw new InvalidConfigurationError(
      'BFT_URL',
      `Could not discover Hapana data from ${BFT_URL}: ${error instanceof Error ? error.message : String(error)}`,
    )
  }

  // Sync captured data into models (no extra API calls)
  console.log(`[BFT Install] Syncing captured data into models...`)
  try {
    const result = await syncFromDiscovery(BFT_URL, discovery)
    console.log(`[BFT Install] Sync complete:`)
    console.log(`  Packages: ${result.packagesCreated}`)
    console.log(`  Classes: ${result.classesCreated}`)
    console.log(`  Business details: updated`)
  } catch (error) {
    console.warn(
      `[BFT Install] Sync failed: ${error instanceof Error ? error.message : String(error)}`,
    )
    console.warn(
      `[BFT Install] You can run the refresh_data tool later to populate data`,
    )
  }

  // Return both BFT_URL and the discovered HAPANA_SITE_ID
  return {
    env: {
      BFT_URL,
      HAPANA_SITE_ID: discovery.siteId,
    },
  }
}
