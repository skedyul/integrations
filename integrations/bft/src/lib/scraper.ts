/**
 * BFT Scraper — Hapana API
 *
 * Two modes:
 *   1. From pre-captured data (install-time): pass in the HapanaDiscoveryResult
 *      that was already intercepted by Playwright — no extra API calls needed.
 *   2. From direct fetch (runtime refresh): uses siteID + fetch to hit the
 *      Hapana API directly.
 */

import {
  fetchSiteSettings,
  fetchSessions,
  fetchPackages,
  fetchSessionDetails,
  getDateRange,
  extractUniqueClasses,
  type HapanaSession,
  type HapanaSiteSettings,
  type HapanaPackage,
  type HapanaDiscoveryResult,
} from './hapana'

// ─────────────────────────────────────────────────────────────────────────────
// Exported Types (unchanged interface for consumers)
// ─────────────────────────────────────────────────────────────────────────────

export interface BusinessDetails {
  name: string
  address: string
  phone: string
  email: string
  websiteUrl: string
  timezone?: string
  currency?: string
}

export interface Package {
  name: string
  description: string
  price: string
  type: 'package' | 'intro_offer'
}

export interface Class {
  name: string
  description: string
  duration?: string
  category?: string
}

export interface ScheduleEntry {
  sessionId: string
  sessionName: string
  date: string
  startTime: string
  endTime: string
  duration: string
  instructor: string
  capacity: number
  reserved: number
  remaining: number
  status: string
  address: string
  sessionTemplate: string
}

export interface Schedule {
  [day: string]: ScheduleEntry[]
}

export interface ScrapedData {
  businessDetails: BusinessDetails
  packages: Package[]
  classes: Class[]
  schedule: Schedule
}

// ─────────────────────────────────────────────────────────────────────────────
// Build ScrapedData from raw Hapana data
// ─────────────────────────────────────────────────────────────────────────────

async function buildScrapedData(
  url: string,
  settings: HapanaSiteSettings | null,
  sessions: HapanaSession[],
  hapanaPackages: HapanaPackage[],
  siteId?: string,
): Promise<ScrapedData> {
  const currencySymbol = settings?.currencySymbol ?? '$'

  // Business details
  const firstSessionAddress = sessions.find((s) => s.address)?.address ?? ''
  const businessDetails: BusinessDetails = {
    name: settings ? `BFT ${settings.siteName}` : 'BFT Club',
    address: firstSessionAddress,
    phone: '',
    email: '',
    websiteUrl: url,
    timezone: settings?.timezone,
    currency: settings
      ? `${settings.currencySymbol} (${settings.currencyCode})`
      : undefined,
  }

  // Packages
  const packages: Package[] = hapanaPackages.map((pkg) => ({
    name: pkg.name,
    description: pkg.description,
    price: pkg.billingCycle
      ? `${currencySymbol}${pkg.amount}/${pkg.billingCycle}`
      : `${currencySymbol}${pkg.amount}`,
    type: pkg.introOffer ? ('intro_offer' as const) : ('package' as const),
  }))

  // Classes (unique session types) - fetch descriptions from session details
  const uniqueClasses = extractUniqueClasses(sessions)
  const classes: Class[] = []

  if (siteId) {
    // Fetch session details for each unique class to get descriptions
    console.log(`[BFT Scraper] Fetching descriptions for ${uniqueClasses.length} unique classes...`)
    for (const cls of uniqueClasses) {
      try {
        const details = await fetchSessionDetails(
          url,
          siteId,
          cls.sessionId,
          cls.sessionDate,
        )
        classes.push({
          name: cls.name.trim(),
          description: details.sessionDescription || cls.template || '',
          duration: cls.duration || undefined,
          category: 'Classes',
        })
        console.log(
          `[BFT Scraper] Fetched description for "${cls.name}": ${details.sessionDescription?.substring(0, 50)}...`,
        )
      } catch (error) {
        console.warn(
          `[BFT Scraper] Failed to fetch description for "${cls.name}": ${error}`,
        )
        // Fallback to template if available
        classes.push({
          name: cls.name.trim(),
          description: cls.template !== cls.name ? cls.template : '',
          duration: cls.duration || undefined,
          category: 'Classes',
        })
      }
    }
  } else {
    // Fallback when siteId is not available (e.g., from discovery)
    classes.push(
      ...uniqueClasses.map((cls) => ({
        name: cls.name.trim(),
        description: cls.template !== cls.name ? cls.template : '',
        duration: cls.duration || undefined,
        category: 'Classes',
      })),
    )
  }

  // Schedule grouped by date
  const schedule: Schedule = {}
  for (const session of sessions) {
    const day = session.sessionDate
    if (!schedule[day]) {
      schedule[day] = []
    }
    schedule[day].push(mapSession(session))
  }

  return { businessDetails, packages, classes, schedule }
}

// ─────────────────────────────────────────────────────────────────────────────
// From Pre-Captured Data (install-time — no extra network calls)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build ScrapedData from a HapanaDiscoveryResult that was already captured
 * by Playwright during install. No additional API calls are made.
 */
export async function buildFromDiscovery(
  url: string,
  discovery: HapanaDiscoveryResult,
): Promise<ScrapedData> {
  console.log(
    `[BFT Scraper] Building from captured data: ${discovery.sessions.length} sessions, ${discovery.packages.length} packages`,
  )
  return buildScrapedData(
    url,
    discovery.settings,
    discovery.sessions,
    discovery.packages,
    discovery.siteId,
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// From Direct Fetch (runtime refresh — uses stored siteID)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Scrape the BFT data by calling the Hapana widget API directly.
 * Requires a working siteID (the one extracted from request URLs during install).
 */
export async function scrapeBftWebsite(
  url: string,
  siteId: string,
): Promise<ScrapedData> {
  console.log(`[BFT Scraper] Fetching via API with siteID: ${siteId}`)

  const { startDate, endDate } = getDateRange(14)

  const [settings, { sessions }, hapanaPackages] = await Promise.all([
    fetchSiteSettings(url, siteId),
    fetchSessions(url, siteId, startDate, endDate),
    fetchPackages(url, siteId),
  ])

  console.log(
    `[BFT Scraper] Fetched: settings="${settings.siteName}", ${sessions.length} sessions, ${hapanaPackages.length} packages`,
  )

  return buildScrapedData(url, settings, sessions, hapanaPackages, siteId)
}

// ─────────────────────────────────────────────────────────────────────────────
// Schedule-only Fetch (for get_schedule tool — live every call)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch only the live schedule from Hapana.
 * Used by the get_schedule tool which always returns fresh data.
 */
export async function fetchLiveSchedule(
  url: string,
  siteId: string,
  daysAhead = 14,
): Promise<Schedule> {
  const { startDate, endDate } = getDateRange(daysAhead)
  const { sessions } = await fetchSessions(url, siteId, startDate, endDate)

  const schedule: Schedule = {}
  for (const session of sessions) {
    const day = session.sessionDate
    if (!schedule[day]) {
      schedule[day] = []
    }
    schedule[day].push(mapSession(session))
  }

  return schedule
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function mapSession(session: HapanaSession): ScheduleEntry {
  return {
    sessionId: session.sessionID,
    sessionName: session.sessionName,
    date: session.sessionDate,
    startTime: session.startTime,
    endTime: session.endTime,
    duration: session.duration,
    instructor: session.instructor,
    capacity: session.capacity,
    reserved: session.reserved,
    remaining: session.remaining,
    status: session.sessionStatus,
    address: session.address,
    sessionTemplate: session.sessionTemplate,
  }
}
