import { defineContentConfig, defineCollection } from '@nuxt/content'
import { z } from 'zod'

/**
 * 遞迴的 LawNode schema 會導致 Nuxt Content 的型別產生器報錯
 *（z.lazy 無法轉譯為 .d.ts），因此 children 放寬為 z.array(z.any())，
 * 實際巢狀結構由執行期程式碼與 JSON 本身保證。
 */
const lawNodeSchema = z.object({
  type: z.enum(['heading', 'article']),
  name: z.string().optional(),
  level: z.number().optional(),
  no: z.string().optional(),
  content: z.string().optional(),
  children: z.array(z.any()),
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
        effectiveNote: z.string().optional(),
        lawUrl: z.string().optional(),
        body: z.array(lawNodeSchema),
      }),
    }),
  },
})
