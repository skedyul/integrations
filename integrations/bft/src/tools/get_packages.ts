import { z, type ToolDefinition, instance } from 'skedyul'
import { createToolResponse } from '../lib/response'

const GetPackagesInputSchema = z.object({})

const GetPackagesOutputSchema = z.object({
  packages: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().optional(),
      price: z.string().optional(),
      type: z.string(),
    }),
  ),
})

type GetPackagesInput = z.infer<typeof GetPackagesInputSchema>
type GetPackagesOutput = z.infer<typeof GetPackagesOutputSchema>

export const getPackagesRegistry: ToolDefinition<
  GetPackagesInput,
  GetPackagesOutput
> = {
  name: 'get_packages',
  label: 'Get Packages',
  description: 'Returns all membership packages from the Packages model',
  inputSchema: GetPackagesInputSchema,
  outputSchema: GetPackagesOutputSchema,
  handler: async (input, context) => {
    try {
      const { data: packages } = await instance.list('package', {
        page: 1,
        limit: 100,
      })

      // Filter to only packages (not intro offers)
      const packageList = packages
        .filter((pkg) => pkg.type === 'package')
        .map((pkg) => ({
          id: pkg.id,
          name: (pkg.name as string) || '',
          description: (pkg.description as string) || undefined,
          price: (pkg.price as string) || undefined,
          type: (pkg.type as string) || 'package',
        }))

      return createToolResponse('get_packages', {
        success: true,
        data: {
          packages: packageList,
        },
        message: `Found ${packageList.length} package(s)`,
      })
    } catch (error) {
      return createToolResponse<GetPackagesOutput>('get_packages', {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve packages',
      })
    }
  },
}
