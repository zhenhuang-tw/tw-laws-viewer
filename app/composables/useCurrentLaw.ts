interface Chapter {
  name?: string
  articles: { no: string; content: string }[]
}

interface LawData {
  pcode: string
  name: string
  customCategory: string
  lawLevel: string
  isAbolished: boolean
  lastSynced: string
  lastAmended: string
  chapters: Chapter[]
}

// 用於 layout 內元件之間共享當前法規資料，
// 避免 ChapterIndex 重複查詢。
export const currentLaw = ref<LawData | null>(null)
