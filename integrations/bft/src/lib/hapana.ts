/**
 * Hapana Widget API Client
 *
 * BFT clubs use the Hapana platform. All data is available via their
 * public widget API at https://widgetapi.hapana.com.
 *
 * Discovery flow (install-time, uses Playwright):
 *   1. Launch headless Chromium and navigate to the BFT club page
 *   2. Intercept ALL requests to widgetapi.hapana.com
 *   3. Extract the siteID from the request URL query params
 *   4. Capture the response data for settings, sessions, and packages
 *   5. Return everything so install can sync without re-fetching
 *
 * Runtime (tools, no browser):
 *   Use the stored siteID with plain fetch() calls to the Hapana API.
 *   The siteID is extracted from the URL the page actually uses — so it
 *   works reliably with direct fetch.
 */

import { chromium } from 'playwright'

const HAPANA_BASE_URL = 'https://widgetapi.hapana.com/v2/wAPI/site'

// ─────────────────────────────────────────────────────────────────────────────
// Types — Site Settings
// ─────────────────────────────────────────────────────────────────────────────

export interface HapanaSiteSettings {
  corporateID: string
  siteID: string
  widgetID: string
  siteName: string
  currencySymbol: string
  currencyCode: string
  timezone: string
  dateFormat: string
  daysToDisplay: number
  displaySessionSize: boolean
  signupAllowed: boolean
  themeConfig: {
    backgroundColor: string
    primaryColor: string
    primaryTextColor: string
    secondaryColor: string
    secondaryTextColor: string
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Types — Sessions
// ─────────────────────────────────────────────────────────────────────────────

export interface HapanaInstructor {
  instructorID: string
  instructorName: string
  instructorProfile: string
}

export interface HapanaSession {
  sessionID: string
  sessionName: string
  sessionDate: string
  startTime: string
  endTime: string
  duration: string
  sessionType: string
  instructor: string
  instructorData: HapanaInstructor[]
  capacity: number
  reserved: number
  remaining: number
  waitlistCapacity: number
  waitlistReserved: number
  waitlistRemaining: number
  sessionStatus: 'open' | 'full' | 'waitlist' | 'complete' | 'closed'
  address: string
  sessionLocationType: string
  timezone: string
  sessionImage: string
  sessionTemplate: string
  sessionTemplateID: string
}

export interface HapanaPagination {
  totalRecords: number
  pageSize: number
  pageIndex: number
  noOfPages: number
}

interface HapanaSessionsResponse {
  success: boolean
  pagination: HapanaPagination
  data: HapanaSession[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Types — Packages
// ─────────────────────────────────────────────────────────────────────────────

export interface HapanaPackage {
  packageID: string
  name: string
  type: string // 'sessionPackage' | 'membership'
  category: string // 'Intro Offers' | 'Passes' | 'Memberships'
  description: string
  amount: number
  billingCycle: string
  earliestCancel: string
  expirationPeriod: string
  introOffer: boolean
  validPurchase: boolean
  sortOrder: number
  sessionType: string
  cmsAccess: boolean
  secondaryRecurringFees?: number
}

interface HapanaPackagesResponse {
  success: boolean
  data: HapanaPackage[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Discovery result — everything captured from the page load
// ─────────────────────────────────────────────────────────────────────────────

export interface HapanaDiscoveryResult {
  siteId: string
  settings: HapanaSiteSettings | null
  sessions: HapanaSession[]
  packages: HapanaPackage[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Full Discovery (install-time only — uses Playwright)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Load the BFT club page in a headless browser, intercept every request to
 * widgetapi.hapana.com, and capture:
 *   - siteID (from the request URL query params)
 *   - settings response
 *   - sessions response (first page — the page only loads page 1)
 *   - packages response
 *
 * This is used once during install. The captured data is synced into models,
 * and the siteID is stored for future runtime API calls.
 */
export async function discoverHapanaData(
  bftUrl: string,
): Promise<HapanaDiscoveryResult> {
  const browser = await chromium.launch({ headless: true })

  try {
    const context = await browser.newContext()
    const page = await context.newPage()

    let siteId: string | null = null
    let settings: HapanaSiteSettings | null = null
    const allSessions: HapanaSession[] = []
    let packages: HapanaPackage[] = []

    // Intercept ALL responses to the Hapana widget API
    page.on('response', async (response) => {
      const url = response.url()

      if (!url.includes('widgetapi.hapana.com')) return

      // Extract siteID from the request URL query params — this is the
      // siteID that actually works (may differ from the one in the response body)
      if (!siteId) {
        try {
          const parsedUrl = new URL(url)
          const urlSiteId = parsedUrl.searchParams.get('siteID')
          if (urlSiteId) {
            siteId = urlSiteId
            console.log(`[Hapana Discovery] Found siteID from URL: ${siteId}`)
          }
        } catch {
          // ignore URL parse errors
        }
      }

      try {
        // Intercept /site/settings
        if (url.includes('/site/settings')) {
          const json = await response.json()
          console.log(`[Hapana Discovery] Intercepted settings: siteName="${json.siteName}"`)
          settings = json as HapanaSiteSettings
        }

        // Intercept /site/sessions
        if (url.includes('/site/sessions')) {
          const json = (await response.json()) as HapanaSessionsResponse
          console.log(
            `[Hapana Discovery] Intercepted sessions: success=${json.success}, count=${json.data?.length ?? 0}`,
          )
          if (json.success && json.data) {
            allSessions.push(...json.data)
            console.log(`[Hapana Discovery] Total sessions so far: ${allSessions.length}`)

            // Log unique session names
            const uniqueNames = [...new Set(json.data.map((s) => s.sessionName))]
            for (const name of uniqueNames) {
              console.log(`[Hapana Discovery]   Session type: "${name}"`)
            }
          }
        }

        // Intercept /site/packages
        if (url.includes('/site/packages')) {
          const json = (await response.json()) as HapanaPackagesResponse
          console.log(
            `[Hapana Discovery] Intercepted packages: success=${json.success}, count=${json.data?.length ?? 0}`,
          )
          if (json.success && json.data) {
            packages = json.data
            for (const pkg of packages) {
              console.log(
                `[Hapana Discovery]   Package: "${pkg.name}" | ${pkg.category} | $${pkg.amount} | introOffer=${pkg.introOffer}`,
              )
            }
          }
        }
      } catch {
        // Ignore JSON parse errors — some responses may not be JSON
      }
    })

    // Navigate and wait for ALL widget requests to complete
    console.log(`[Hapana Discovery] Navigating to ${bftUrl}...`)
    await page.goto(bftUrl, { waitUntil: 'networkidle', timeout: 30000 })

    // Give a little extra time for any late responses
    await page.waitForTimeout(2000)

    if (!siteId) {
      throw new Error(
        'Could not find Hapana siteID. No requests to widgetapi.hapana.com were detected on the page.',
      )
    }

    console.log(`[Hapana Discovery] Complete:`)
    console.log(`  siteID: ${siteId}`)
    console.log(`  settings: ${settings ? 'captured' : 'missing'}`)
    console.log(`  sessions: ${allSessions.length}`)
    console.log(`  packages: ${packages.length}`)

    return { siteId, settings, sessions: allSessions, packages }
  } finally {
    await browser.close()
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Runtime API Methods (no browser — plain fetch)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch site settings from the Hapana API.
 */
export async function fetchSiteSettings(
  siteId: string,
): Promise<HapanaSiteSettings> {
  const url = `${HAPANA_BASE_URL}/settings?siteID=${encodeURIComponent(siteId)}`
  console.log(`[Hapana] Fetching settings: ${url}`)
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Hapana settings API error: HTTP ${response.status}`)
  }

  return (await response.json()) as HapanaSiteSettings
}

/**
 * Fetch sessions (timetable) from the Hapana API.
 * Handles pagination automatically — returns ALL sessions in the date range.
 */
export async function fetchSessions(
  siteId: string,
  startDate: string,
  endDate: string,
  sessionCategory = 'classes',
): Promise<{ sessions: HapanaSession[]; pagination: HapanaPagination }> {
  const allSessions: HapanaSession[] = []
  let pageIndex = 1
  let totalPages = 1
  let pagination: HapanaPagination = {
    totalRecords: 0,
    pageSize: 20,
    pageIndex: 1,
    noOfPages: 1,
  }

  while (pageIndex <= totalPages) {
    const params = new URLSearchParams({
      startDate,
      endDate,
      sessionCategory,
      siteID: siteId,
      pageIndex: String(pageIndex),
      pageSize: '20',
    })

    const url = `${HAPANA_BASE_URL}/sessions?${params.toString()}`
    console.log(`[Hapana] Fetching sessions: ${url}`)

    const response = await fetch(url)

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      console.error(`[Hapana] Sessions API HTTP ${response.status}: ${body}`)
      throw new Error(`Hapana sessions API error: HTTP ${response.status}`)
    }

    const data = (await response.json()) as HapanaSessionsResponse
    console.log(
      `[Hapana] Sessions page ${pageIndex}: success=${data.success}, records=${data.data?.length ?? 0}`,
    )

    if (!data.success) {
      console.warn(`[Hapana] Sessions API returned success=false for page ${pageIndex}`)
      break
    }

    allSessions.push(...data.data)
    pagination = data.pagination
    totalPages = data.pagination.noOfPages
    pageIndex++
  }

  console.log(`[Hapana] Total sessions fetched: ${allSessions.length}`)
  return { sessions: allSessions, pagination }
}

/**
 * Fetch packages (memberships, passes, intro offers) from the Hapana API.
 */
export async function fetchPackages(
  siteId: string,
): Promise<HapanaPackage[]> {
  const params = new URLSearchParams({
    siteID: siteId,
    isMultiSignature: 'true',
  })

  const url = `${HAPANA_BASE_URL}/packages?${params.toString()}`
  console.log(`[Hapana] Fetching packages: ${url}`)

  const response = await fetch(url)

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    console.error(`[Hapana] Packages API HTTP ${response.status}: ${body}`)
    throw new Error(`Hapana packages API error: HTTP ${response.status}`)
  }

  const data = (await response.json()) as HapanaPackagesResponse
  console.log(
    `[Hapana] Packages response: success=${data.success}, count=${data.data?.length ?? 0}`,
  )

  if (!data.success) {
    throw new Error('Hapana packages API returned success=false')
  }

  for (const pkg of data.data) {
    console.log(
      `[Hapana]   Package: "${pkg.name}" | ${pkg.category} | $${pkg.amount} | introOffer=${pkg.introOffer}`,
    )
  }

  return data.data
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format a date as YYYY-MM-DD.
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Get a date range: today → today + daysAhead.
 */
export function getDateRange(daysAhead = 14): {
  startDate: string
  endDate: string
} {
  const start = new Date()
  const end = new Date()
  end.setDate(end.getDate() + daysAhead)
  return {
    startDate: formatDate(start),
    endDate: formatDate(end),
  }
}

/**
 * Extract unique class types from a list of sessions.
 */
export function extractUniqueClasses(
  sessions: HapanaSession[],
): Array<{ name: string; template: string; duration: string; image: string }> {
  const seen = new Set<string>()
  const classes: Array<{
    name: string
    template: string
    duration: string
    image: string
  }> = []

  for (const session of sessions) {
    const key = session.sessionTemplate || session.sessionName
    if (!seen.has(key)) {
      seen.add(key)
      classes.push({
        name: session.sessionName,
        template: session.sessionTemplate,
        duration: session.duration,
        image: session.sessionImage,
      })
    }
  }

  return classes
}
