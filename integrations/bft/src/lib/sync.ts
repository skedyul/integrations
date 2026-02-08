import { instance } from 'skedyul'
import {
  scrapeBftWebsite,
  buildFromDiscovery,
  type ScrapedData,
} from './scraper'
import type { HapanaDiscoveryResult } from './hapana'

export interface SyncResult {
  packagesCreated: number
  classesCreated: number
  businessDetailsUpdated: boolean
  scrapedData: ScrapedData
}

/**
 * Parses the club name from a BFT URL.
 */
function parseClubName(url: string): string {
  const match = url.match(/\/club\/([^\/]+)\/?$/)
  return match ? match[1] : ''
}

/**
 * Sync pre-captured Hapana discovery data into Skedyul models.
 * Used during install — no extra API calls needed.
 */
export async function syncFromDiscovery(
  bftUrl: string,
  discovery: HapanaDiscoveryResult,
  options?: {
    syncPackages?: boolean
    syncClasses?: boolean
    syncBusinessDetails?: boolean
  },
): Promise<SyncResult> {
  console.log(`[BFT Sync] Syncing from captured data...`)
  const data = buildFromDiscovery(bftUrl, discovery)
  return syncData(bftUrl, data, options)
}

/**
 * Scrape the BFT website via the Hapana API and sync the data into
 * Skedyul models (Packages, Classes, BusinessDetails).
 * Used by the refresh_data tool at runtime.
 */
export async function scrapeAndSync(
  bftUrl: string,
  siteId: string,
  options?: {
    syncPackages?: boolean
    syncClasses?: boolean
    syncBusinessDetails?: boolean
  },
): Promise<SyncResult> {
  console.log(`[BFT Sync] Scraping ${bftUrl} with siteID ${siteId}...`)
  const data = await scrapeBftWebsite(bftUrl, siteId)
  return syncData(bftUrl, data, options)
}

/**
 * Write ScrapedData into Skedyul models.
 * Supports selective syncing via options parameter.
 */
async function syncData(
  bftUrl: string,
  data: ScrapedData,
  options?: {
    syncPackages?: boolean
    syncClasses?: boolean
    syncBusinessDetails?: boolean
  },
): Promise<SyncResult> {
  const clubId = parseClubName(bftUrl)
  
  // Default to syncing everything if no options provided
  const syncPackages = options?.syncPackages !== false
  const syncClasses = options?.syncClasses !== false
  const syncBusinessDetails = options?.syncBusinessDetails !== false

  let businessDetailsUpdated = false

  // Update or create business details
  if (syncBusinessDetails) {
    const { data: existingBusinessDetails } = await instance.list(
      'business_details',
      { page: 1, limit: 1 },
    )

    const bdFields = {
      name: data.businessDetails.name,
      club_id: clubId,
      address: data.businessDetails.address,
      phone: data.businessDetails.phone,
      email: data.businessDetails.email,
      website_url: data.businessDetails.websiteUrl,
    }

    if (existingBusinessDetails.length > 0) {
      await instance.update(
        'business_details',
        existingBusinessDetails[0].id,
        bdFields,
      )
    } else {
      await instance.create('business_details', bdFields)
    }
    businessDetailsUpdated = true
    console.log(`[BFT Sync] Business details updated`)
  }

  // Create packages
  let packagesCreated = 0
  if (syncPackages) {
    for (const pkg of data.packages) {
      try {
        await instance.create('package', {
          name: pkg.name,
          description: pkg.description,
          price: pkg.price,
          type: pkg.type,
        })
        packagesCreated++
      } catch (error) {
        console.error(`[BFT Sync] Failed to create package ${pkg.name}:`, error)
      }
    }
    console.log(`[BFT Sync] Created ${packagesCreated} packages`)
  }

  // Create classes
  let classesCreated = 0
  if (syncClasses) {
    for (const cls of data.classes) {
      try {
        await instance.create('class', {
          name: cls.name,
          description: cls.description,
          duration: cls.duration,
          category: cls.category,
        })
        classesCreated++
      } catch (error) {
        console.error(`[BFT Sync] Failed to create class ${cls.name}:`, error)
      }
    }
    console.log(`[BFT Sync] Created ${classesCreated} classes`)
  }

  return {
    packagesCreated,
    classesCreated,
    businessDetailsUpdated,
    scrapedData: data,
  }
}
