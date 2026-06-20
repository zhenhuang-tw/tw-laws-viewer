import { defineContentConfig, defineCollection, z } from '@nuxt/content'

const lawNodeSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    type: z.enum(['heading', 'article']),
    name: z.string().optional(),
    level: z.number().optional(),
    no: z.string().optional(),
    content: z.string().optional(),
    children: z.array(lawNodeSchema),
  }),
)

export default defineContentConfig({
  collections: {
    laws: defineCollection({
      type: 'data',
      source: 'laws/*.json',
      schema: z.object({
        pcode: z.string(),
        name: z.string(),
        customCategory: z.string(),
        lawLevel: z.string(),
        isAbolished: z.boolean().default(false),
        lastSynced: z.string(),
        lastAmended: z.string(),
        body: z.array(lawNodeSchema),
      }),
    }),
  },
})
