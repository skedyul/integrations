import { chromium, type Browser, type Page } from 'playwright'

export interface BusinessDetails {
  name: string
  address: string
  phone: string
  email: string
  websiteUrl: string
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

export interface Schedule {
  [day: string]: Array<{
    time: string
    class: string
    instructor?: string
  }>
}

export interface ScrapedData {
  businessDetails: BusinessDetails
  packages: Package[]
  classes: Class[]
  schedule: Schedule
}

/**
 * Intercepts and captures JSON responses from network requests
 */
async function interceptJsonResponses(page: Page): Promise<Map<string, unknown>> {
  const jsonResponses = new Map<string, unknown>()

  page.on('response', async (response) => {
    const url = response.url()
    const contentType = response.headers()['content-type'] || ''

    // Capture JSON responses (API calls)
    if (contentType.includes('application/json') || url.includes('.json') || url.includes('/api/')) {
      try {
        const json = await response.json()
        jsonResponses.set(url, json)
      } catch (error) {
        // Not all JSON responses are parseable, ignore errors
      }
    }
  })

  return jsonResponses
}

/**
 * Scrapes the BFT website for business details, packages, classes, and schedule
 * Uses Playwright to handle dynamic content and intercept JSON requests
 */
export async function scrapeBftWebsite(url: string): Promise<ScrapedData> {
  let browser: Browser | null = null

  try {
    browser = await chromium.launch({ headless: true })
    const context = await browser.newContext()
    const page = await context.newPage()

    // Set up JSON response interception
    const jsonResponses = await interceptJsonResponses(page)

    // Navigate to the page
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })

    // Wait for key elements to load
    await page.waitForSelector('h1', { timeout: 10000 }).catch(() => {
      // Continue even if h1 doesn't appear
    })

    // Wait a bit more for any lazy-loaded content
    await page.waitForTimeout(2000)

    // Extract business details from the DOM
    const businessDetails: BusinessDetails = {
      name: (await page.locator('h1').first().textContent())?.trim() || 'BFT',
      address: '',
      phone: '',
      email: '',
      websiteUrl: url,
    }

    // Try to find address
    const addressSelectors = [
      'a[href*="maps"]',
      '[class*="address"]',
      'address',
    ]

    for (const selector of addressSelectors) {
      const addressEl = page.locator(selector).first()
      if (await addressEl.count() > 0) {
        const addressText = (await addressEl.textContent())?.trim()
        if (addressText && addressText.length > 10) {
          businessDetails.address = addressText
          break
        }
      }
    }

    // Try to find phone
    const phoneSelectors = [
      'a[href^="tel:"]',
      '[class*="phone"]',
    ]

    for (const selector of phoneSelectors) {
      const phoneEl = page.locator(selector).first()
      if (await phoneEl.count() > 0) {
        const phoneText = (await phoneEl.textContent())?.trim()
        if (phoneText) {
          businessDetails.phone = phoneText
          break
        }
      }
    }

    // Try to find email
    const emailEl = page.locator('a[href^="mailto:"]').first()
    if (await emailEl.count() > 0) {
      const emailText = (await emailEl.textContent())?.trim()
      if (emailText) {
        businessDetails.email = emailText
      }
    }

    // Extract packages from the Packages section
    const packages: Package[] = []

    // Look for packages section
    const packagesSection = page.locator('[class*="package"], [id*="package"], h2:has-text("Packages")').first()
    if (await packagesSection.count() > 0) {
      // Find all package items
      const packageItems = page.locator('[class*="package-item"], [class*="membership"], [class*="pass"]')
      const packageCount = await packageItems.count()

      for (let i = 0; i < packageCount; i++) {
        const item = packageItems.nth(i)
        const name = (await item.locator('h3, h4, [class*="title"], [class*="name"]').first().textContent())?.trim() || ''
        const description = (await item.locator('p, [class*="description"], [class*="desc"]').first().textContent())?.trim() || ''
        const price = (await item.locator('[class*="price"], [class*="cost"], [class*="amount"]').first().textContent())?.trim() || ''

        if (name) {
          const isIntroOffer = name.toLowerCase().includes('intro') ||
            name.toLowerCase().includes('first') ||
            name.toLowerCase().includes('trial') ||
            description.toLowerCase().includes('intro') ||
            description.toLowerCase().includes('first')

          packages.push({
            name,
            description,
            price,
            type: isIntroOffer ? 'intro_offer' : 'package',
          })
        }
      }
    }

    // Extract intro offers separately (from Learn More / First Timers section)
    const introOfferSection = page.locator('h2:has-text("LEARN MORE"), h2:has-text("First"), [class*="intro"], [class*="trial"]').first()
    if (await introOfferSection.count() > 0) {
      const introText = (await introOfferSection.locator('..').locator('p, [class*="description"]').first().textContent())?.trim() || ''
      if (introText && !packages.some(p => p.type === 'intro_offer')) {
        packages.push({
          name: 'Intro Offer',
          description: introText,
          price: '',
          type: 'intro_offer',
        })
      }
    }

    // Extract classes from Programs section
    const classes: Class[] = []

    // Look for classes/programs section
    const programsSection = page.locator('h2:has-text("Program"), [class*="program"], [class*="class"]').first()
    if (await programsSection.count() > 0) {
      const classItems = page.locator('[class*="class-item"], [class*="program-item"]')
      const classCount = await classItems.count()

      for (let i = 0; i < classCount; i++) {
        const item = classItems.nth(i)
        const name = (await item.locator('h3, h4, [class*="title"], [class*="name"]').first().textContent())?.trim() || ''
        const description = (await item.locator('p, [class*="description"]').first().textContent())?.trim() || ''
        const duration = (await item.locator('[class*="duration"], [class*="time"]').first().textContent())?.trim() || ''
        const category = (await item.locator('[class*="category"], [class*="type"]').first().textContent())?.trim() || ''

        if (name) {
          classes.push({
            name,
            description,
            duration: duration || undefined,
            category: category || undefined,
          })
        }
      }
    }

    // Extract schedule from the Schedule section
    const schedule: Schedule = {}

    // Look for schedule section
    const scheduleSection = page.locator('h2:has-text("Schedule"), [class*="schedule"], [id*="schedule"]').first()
    if (await scheduleSection.count() > 0) {
      // Try to find schedule items
      const scheduleItems = page.locator('[class*="schedule-item"], [class*="class-slot"], [class*="time-slot"]')
      const scheduleCount = await scheduleItems.count()

      for (let i = 0; i < scheduleCount; i++) {
        const item = scheduleItems.nth(i)
        const time = (await item.locator('[class*="time"], h4, [class*="hour"]').first().textContent())?.trim() || ''
        const className = (await item.locator('h3, [class*="class-name"], [class*="title"]').first().textContent())?.trim() || ''
        const instructor = (await item.locator('[class*="instructor"], [class*="trainer"]').first().textContent())?.trim() || ''

        if (time && className) {
          // Try to determine day from parent context
          const dayHeader = await item.locator('..').locator('h4, [class*="day"]').first().textContent().catch(() => null)
          const day = dayHeader?.trim() || 'Monday'

          if (!schedule[day]) {
            schedule[day] = []
          }

          schedule[day].push({
            time,
            class: className,
            instructor: instructor || undefined,
          })
        }
      }
    }

    // Also check JSON responses for schedule/packages data
    for (const [responseUrl, jsonData] of jsonResponses.entries()) {
      // Look for schedule data in JSON
      if (responseUrl.includes('schedule') || responseUrl.includes('class') || responseUrl.includes('booking')) {
        try {
          const data = jsonData as Record<string, unknown>
          // Try to extract schedule from JSON structure
          if (Array.isArray(data)) {
            // Handle array of schedule items
            for (const item of data) {
              if (typeof item === 'object' && item !== null) {
                const scheduleItem = item as Record<string, unknown>
                const day = String(scheduleItem.day || scheduleItem.date || 'Monday')
                const time = String(scheduleItem.time || scheduleItem.startTime || '')
                const className = String(scheduleItem.className || scheduleItem.name || scheduleItem.title || '')

                if (time && className) {
                  if (!schedule[day]) {
                    schedule[day] = []
                  }
                  schedule[day].push({
                    time,
                    class: className,
                    instructor: scheduleItem.instructor ? String(scheduleItem.instructor) : undefined,
                  })
                }
              }
            }
          } else if (typeof data === 'object' && data !== null) {
            // Handle object with schedule data
            const scheduleData = data as Record<string, unknown>
            if (scheduleData.schedule || scheduleData.classes || scheduleData.items) {
              const items = (scheduleData.schedule || scheduleData.classes || scheduleData.items) as unknown[]
              if (Array.isArray(items)) {
                for (const item of items) {
                  if (typeof item === 'object' && item !== null) {
                    const scheduleItem = item as Record<string, unknown>
                    const day = String(scheduleItem.day || scheduleItem.date || 'Monday')
                    const time = String(scheduleItem.time || scheduleItem.startTime || '')
                    const className = String(scheduleItem.className || scheduleItem.name || scheduleItem.title || '')

                    if (time && className) {
                      if (!schedule[day]) {
                        schedule[day] = []
                      }
                      schedule[day].push({
                        time,
                        class: className,
                        instructor: scheduleItem.instructor ? String(scheduleItem.instructor) : undefined,
                      })
                    }
                  }
                }
              }
            }
          }
        } catch (error) {
          // Ignore JSON parsing errors
        }
      }

      // Look for packages data in JSON
      if (responseUrl.includes('package') || responseUrl.includes('membership') || responseUrl.includes('pricing')) {
        try {
          const data = jsonData as Record<string, unknown>
          if (Array.isArray(data)) {
            for (const item of data) {
              if (typeof item === 'object' && item !== null) {
                const packageItem = item as Record<string, unknown>
                const name = String(packageItem.name || packageItem.title || '')
                const description = String(packageItem.description || '')
                const price = String(packageItem.price || packageItem.cost || '')

                if (name) {
                  packages.push({
                    name,
                    description,
                    price,
                    type: 'package',
                  })
                }
              }
            }
          }
        } catch (error) {
          // Ignore JSON parsing errors
        }
      }
    }

    return {
      businessDetails,
      packages,
      classes,
      schedule,
    }
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}
