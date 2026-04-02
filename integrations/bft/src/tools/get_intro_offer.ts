import { z, type ToolDefinition, instance, createSuccessResponse, createExternalError } from 'skedyul'

const GetIntroOfferInputSchema = z.object({})

const GetIntroOfferOutputSchema = z.object({
  introOffer: z
    .object({
      id: z.string(),
      name: z.string(),
      description: z.string().optional(),
      price: z.string().optional(),
      type: z.string(),
    })
    .nullable(),
})

type GetIntroOfferInput = z.infer<typeof GetIntroOfferInputSchema>
type GetIntroOfferOutput = z.infer<typeof GetIntroOfferOutputSchema>

export const getIntroOfferRegistry: ToolDefinition<
  GetIntroOfferInput,
  GetIntroOfferOutput
> = {
  name: 'get_intro_offer',
  label: 'Get Intro Offer',
  description: 'Returns the intro offer from the Packages model',
  inputSchema: GetIntroOfferInputSchema,
  outputSchema: GetIntroOfferOutputSchema,
  handler: async (input, context) => {
    try {
      const { data: packages } = await instance.list('package', {
        page: 1,
        limit: 100,
      })

      const introOffer = packages.find((pkg) => pkg.type === 'intro_offer')

      if (!introOffer) {
        return createSuccessResponse({ introOffer: null })
      }

      return createSuccessResponse({
        introOffer: {
          id: introOffer.id,
          name: (introOffer.name as string) || '',
          description: (introOffer.description as string) || undefined,
          price: (introOffer.price as string) || undefined,
          type: (introOffer.type as string) || 'intro_offer',
        },
      })
    } catch (error) {
      return createExternalError(
        'BFT',
        error instanceof Error ? error.message : 'Failed to retrieve intro offer',
      )
    }
  },
}
