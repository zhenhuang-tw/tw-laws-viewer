interface LawNode {
  type: 'heading' | 'article'
  name?: string
  level?: number
  no?: string
  content?: string
  children: LawNode[]
}

interface LawData {
  pcode: string
  name: string
  customCategory: string
  lawLevel: string
  isAbolished: boolean
  lastSynced: string
  lastAmended: string
  effectiveNote?: string
  lawUrl?: string
  body: LawNode[]
}

export const currentLaw = ref<LawData | null>(null)
