/**
 * Hapana Widget API Client
 *
 * BFT clubs use the Hapana platform. All data is available via their
 * widget API at https://widgetapi.hapana.com, which requires browser
 * context for secure authentication.
 *
 * All API calls use Playwright to intercept browser requests:
 *   1. Launch headless Chromium and navigate to the BFT club page
 *   2. Intercept requests to widgetapi.hapana.com
 *   3. Extract the siteID from the request URL query params
 *   4. Capture the response data (settings, sessions, packages)
 *
 * Discovery flow (install-time):
 *   - Intercepts ALL API calls during initial page load
 *   - Captures settings, sessions, and packages in one go
 *   - Returns everything so install can sync without re-fetching
 *
 * Runtime (tools):
 *   - Each API call (settings, sessions, packages) uses Playwright
 *   - Navigates to the page and intercepts the specific endpoint
 *   - Ensures secure authentication via browser context
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
// Runtime API Methods (uses Playwright to intercept secure client requests)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch site settings from the Hapana API by intercepting browser requests.
 * Uses Playwright to load the page and intercept the secure API response.
 */
export async function fetchSiteSettings(
  bftUrl: string,
  siteId: string,
): Promise<HapanaSiteSettings> {
  const browser = await chromium.launch({ headless: true })

  try {
    const context = await browser.newContext()
    const page = await context.newPage()

    let settings: HapanaSiteSettings | null = null

    // Intercept the settings API response
    page.on('response', async (response) => {
      const url = response.url()
      if (url.includes('/site/settings') && url.includes('widgetapi.hapana.com')) {
        try {
          const json = await response.json()
          settings = json as HapanaSiteSettings
          console.log(`[Hapana] Intercepted settings: siteName="${settings.siteName}"`)
        } catch {
          // Ignore JSON parse errors
        }
      }
    })

    // Navigate and wait for the settings API call
    console.log(`[Hapana] Loading page to intercept settings API: ${bftUrl}`)
    await page.goto(bftUrl, { waitUntil: 'networkidle', timeout: 30000 })

    // Give extra time for API response
    await page.waitForTimeout(2000)

    if (!settings) {
      throw new Error('Could not intercept Hapana settings API response')
    }

    return settings
  } finally {
    await browser.close()
  }
}

/**
 * Fetch sessions (timetable) from the Hapana API by intercepting browser requests.
 * Uses Playwright to load the page and intercept all session API responses (handles pagination).
 */
export async function fetchSessions(
  bftUrl: string,
  siteId: string,
  startDate: string,
  endDate: string,
  sessionCategory = 'classes',
): Promise<{ sessions: HapanaSession[]; pagination: HapanaPagination }> {
  const browser = await chromium.launch({ headless: true })

  try {
    const context = await browser.newContext()
    const page = await context.newPage()

    const allSessions: HapanaSession[] = []
    let pagination: HapanaPagination = {
      totalRecords: 0,
      pageSize: 20,
      pageIndex: 1,
      noOfPages: 1,
    }

    // Intercept all session API responses (may be multiple pages)
    page.on('response', async (response) => {
      const url = response.url()
      if (url.includes('/site/sessions') && url.includes('widgetapi.hapana.com')) {
        try {
          const json = (await response.json()) as HapanaSessionsResponse
          console.log(
            `[Hapana] Intercepted sessions: success=${json.success}, count=${json.data?.length ?? 0}`,
          )

          if (json.success && json.data) {
            allSessions.push(...json.data)
            pagination = json.pagination
            console.log(`[Hapana] Total sessions so far: ${allSessions.length}`)
          }
        } catch {
          // Ignore JSON parse errors
        }
      }
    })

    // Navigate and wait for all session API calls
    console.log(`[Hapana] Loading page to intercept sessions API: ${bftUrl}`)
    await page.goto(bftUrl, { waitUntil: 'networkidle', timeout: 30000 })

    // Give extra time for paginated API responses
    await page.waitForTimeout(3000)

    // If we got pagination info, try to trigger additional pages if needed
    // The widget may load additional pages automatically, but we'll wait a bit more
    if (pagination.noOfPages > 1 && allSessions.length < pagination.totalRecords) {
      console.log(
        `[Hapana] Detected ${pagination.noOfPages} pages, but only got ${allSessions.length} sessions. Waiting for more...`,
      )
      await page.waitForTimeout(2000)
    }

    console.log(`[Hapana] Total sessions intercepted: ${allSessions.length}`)
    return { sessions: allSessions, pagination }
  } finally {
    await browser.close()
  }
}

/**
 * Fetch packages (memberships, passes, intro offers) from the Hapana API by intercepting browser requests.
 * Uses Playwright to load the page and intercept the secure API response.
 */
export async function fetchPackages(
  bftUrl: string,
  siteId: string,
): Promise<HapanaPackage[]> {
  const browser = await chromium.launch({ headless: true })

  try {
    const context = await browser.newContext()
    const page = await context.newPage()

    let packages: HapanaPackage[] = []

    // Intercept the packages API response
    page.on('response', async (response) => {
      const url = response.url()
      if (url.includes('/site/packages') && url.includes('widgetapi.hapana.com')) {
        try {
          const json = (await response.json()) as HapanaPackagesResponse
          console.log(
            `[Hapana] Intercepted packages: success=${json.success}, count=${json.data?.length ?? 0}`,
          )

          if (json.success && json.data) {
            packages = json.data
            for (const pkg of packages) {
              console.log(
                `[Hapana]   Package: "${pkg.name}" | ${pkg.category} | $${pkg.amount} | introOffer=${pkg.introOffer}`,
              )
            }
          }
        } catch {
          // Ignore JSON parse errors
        }
      }
    })

    // Navigate and wait for the packages API call
    console.log(`[Hapana] Loading page to intercept packages API: ${bftUrl}`)
    await page.goto(bftUrl, { waitUntil: 'networkidle', timeout: 30000 })

    // Give extra time for API response
    await page.waitForTimeout(2000)

    if (packages.length === 0) {
      throw new Error('Could not intercept Hapana packages API response')
    }

    return packages
  } finally {
    await browser.close()
  }
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
