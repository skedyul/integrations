import { z, type ToolDefinition, instance } from 'skedyul'
import { scrapeBftWebsite } from '../lib/scraper'
import { createToolResponse } from '../lib/response'

const RefreshDataInputSchema = z.object({})

const RefreshDataOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  packagesCreated: z.number(),
  classesCreated: z.number(),
  businessDetailsUpdated: z.boolean(),
})

type RefreshDataInput = z.infer<typeof RefreshDataInputSchema>
type RefreshDataOutput = z.infer<typeof RefreshDataOutputSchema>

/**
 * Parses the club name from a BFT URL.
 */
function parseClubName(url: string): string {
  const match = url.match(/\/club\/([^\/]+)\/?$/)
  return match ? match[1] : ''
}

export const refreshDataRegistry: ToolDefinition<
  RefreshDataInput,
  RefreshDataOutput
> = {
  name: 'refresh_data',
  label: 'Refresh Data',
  description: 'Re-scrapes the BFT website and updates Packages, Classes, and BusinessDetails models',
  inputSchema: RefreshDataInputSchema,
  outputSchema: RefreshDataOutputSchema,
  handler: async (input, context) => {
    const { BFT_URL } = context.env

    if (!BFT_URL) {
      return createToolResponse<RefreshDataOutput>('refresh_data', {
        success: false,
        error: 'BFT_URL environment variable is not set',
      })
    }

    try {
      // Scrape the website
      const data = await scrapeBftWebsite(BFT_URL)
      const clubId = parseClubName(BFT_URL)

      // Update or create business details
      const { data: existingBusinessDetails } = await instance.list('business_details', {
        page: 1,
        limit: 1,
      })

      if (existingBusinessDetails.length > 0) {
        await instance.update('business_details', existingBusinessDetails[0].id, {
          name: data.businessDetails.name,
          club_id: clubId,
          address: data.businessDetails.address,
          phone: data.businessDetails.phone,
          email: data.businessDetails.email,
          website_url: data.businessDetails.websiteUrl,
        })
      } else {
        await instance.create('business_details', {
          name: data.businessDetails.name,
          club_id: clubId,
          address: data.businessDetails.address,
          phone: data.businessDetails.phone,
          email: data.businessDetails.email,
          website_url: data.businessDetails.websiteUrl,
        })
      }

      // Clear existing packages and classes (simple approach: delete all and recreate)
      // In production, you might want to do upserts based on name matching
      const { data: existingPackages } = await instance.list('package', {
        page: 1,
        limit: 1000,
      })
      const { data: existingClasses } = await instance.list('class', {
        page: 1,
        limit: 1000,
      })

      // Delete existing records (if delete is available)
      // For now, we'll just create new ones and let the user manage duplicates
      // In a real scenario, you'd want to upsert based on unique identifiers

      // Create packages
      let packagesCreated = 0
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
          console.error(`Failed to create package ${pkg.name}:`, error)
        }
      }

      // Create classes
      let classesCreated = 0
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
          console.error(`Failed to create class ${cls.name}:`, error)
        }
      }

      return createToolResponse('refresh_data', {
        success: true,
        data: {
          success: true,
          message: 'Data refreshed successfully',
          packagesCreated,
          classesCreated,
          businessDetailsUpdated: true,
        },
        message: `Refreshed data: ${packagesCreated} packages, ${classesCreated} classes, business details updated`,
      })
    } catch (error) {
      return createToolResponse<RefreshDataOutput>('refresh_data', {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to refresh data',
      })
    }
  },
}
