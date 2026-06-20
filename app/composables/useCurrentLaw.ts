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

/** 當前法規是否有章節標題（用於控制右欄/章節按鈕/內嵌 TOC 顯示） */
export const hasHeadings = computed(() => {
  function check(nodes: LawNode[]): boolean {
    for (const node of nodes) {
      if (node.type === 'heading') return true
      if (node.children?.length && check(node.children)) return true
    }
    return false
  }
  return currentLaw.value ? check(currentLaw.value.body) : false
})
