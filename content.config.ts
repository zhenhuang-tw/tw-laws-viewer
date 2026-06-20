import { defineContentConfig, defineCollection, z } from '@nuxt/content'

const articleSchema = z.object({
  no: z.string(),
  content: z.string(),
})

const chapterSchema = z.object({
  name: z.string().optional(),
  articles: z.array(articleSchema),
})

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
        chapters: z.array(chapterSchema),
      }),
    }),
  },
})
