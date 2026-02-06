import { z, type ToolDefinition, instance } from 'skedyul'
import { createToolResponse } from '../lib/response'

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

      // Find the intro offer
      const introOffer = packages.find((pkg) => pkg.type === 'intro_offer')

      if (!introOffer) {
        return createToolResponse('get_intro_offer', {
          success: true,
          data: {
            introOffer: null,
          },
          message: 'No intro offer found',
        })
      }

      return createToolResponse('get_intro_offer', {
        success: true,
        data: {
          introOffer: {
            id: introOffer.id,
            name: (introOffer.name as string) || '',
            description: (introOffer.description as string) || undefined,
            price: (introOffer.price as string) || undefined,
            type: (introOffer.type as string) || 'intro_offer',
          },
        },
        message: 'Intro offer retrieved successfully',
      })
    } catch (error) {
      return createToolResponse<GetIntroOfferOutput>('get_intro_offer', {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve intro offer',
      })
    }
  },
}
