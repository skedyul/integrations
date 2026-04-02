import { z, type ToolDefinition, instance, createSuccessResponse, createExternalError } from 'skedyul'

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

      const packageList = packages
        .filter((pkg) => pkg.type === 'package')
        .map((pkg) => ({
          id: pkg.id,
          name: (pkg.name as string) || '',
          description: (pkg.description as string) || undefined,
          price: (pkg.price as string) || undefined,
          type: (pkg.type as string) || 'package',
        }))

      return createSuccessResponse({ packages: packageList })
    } catch (error) {
      return createExternalError(
        'BFT',
        error instanceof Error ? error.message : 'Failed to retrieve packages',
      )
    }
  },
}
