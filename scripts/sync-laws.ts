import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { inflateSync } from 'node:zlib'
import { laws, type LawEntry } from '../config/laws.config'

// ── 內部儲存型別（與 content.config.ts Zod schema 對應） ──

interface LawNode {
  type: 'heading' | 'article'
  name?: string
  level?: number
  no?: string
  content?: string
  children: LawNode[]
}

interface LawContent {
  pcode: string
  name: string
  customCategory: string
  lawLevel: string
  isAbolished: boolean
  lastSynced: string
  lastAmended: string
  body: LawNode[]
}

// ── ZIP 解壓縮（僅處理單檔 deflate / store） ──

function extractJsonFromZip(zipBuf: Buffer): string {
  // 找 local file header 簽名 "PK\x03\x04"
  const sig = Buffer.from([0x50, 0x4b, 0x03, 0x04])
  let offset = zipBuf.indexOf(sig)
  if (offset === -1) throw new Error('非 ZIP 格式')

  // 讀 local file header（30 bytes）
  const compression = zipBuf.readUInt16LE(offset + 8)
  const compressedSize = zipBuf.readUInt32LE(offset + 18)
  const fileNameLen = zipBuf.readUInt16LE(offset + 26)
  const extraLen = zipBuf.readUInt16LE(offset + 28)
  const dataOffset = offset + 30 + fileNameLen + extraLen

  const compressed = zipBuf.subarray(dataOffset, dataOffset + compressedSize)

  if (compression === 0) {
    // stored（無壓縮）
    return compressed.toString('utf-8')
  } else if (compression === 8) {
    // deflate
    return inflateSync(compressed).toString('utf-8')
  } else {
    throw new Error(`不支援的壓縮方式：${compression}`)
  }
}

// ── JSON API 型別 ──

const API_URL = 'https://law.moj.gov.tw/api/ch/law/json'

interface RawArticle {
  ArticleType: 'C' | 'A'
  ArticleNo?: string
  ArticleContent: string 
}

interface RawLaw {
  LawLevel: string
  LawName: string
  LawURL: string
  LawCategory: string
  LawModifiedDate: string
  LawAbandonNote?: string
  LawArticles: { Article: RawArticle[] } | RawArticle[]
}

interface RawLawsRoot {
  UpdateDate: string
  Laws: RawLaw[]
}

// ── API 互動 ──

let cachedLawsByPcode: Map<string, RawLaw> | null = null

async function fetchAllLaws(): Promise<Map<string, RawLaw>> {
  if (cachedLawsByPcode) return cachedLawsByPcode

  const res = await fetch(API_URL, { headers: { Accept: 'application/json' } })
  if (!res.ok) {
    throw new Error(`下載全國法規資料庫失敗：HTTP ${res.status}`)
  }

  const buf = Buffer.from(await res.arrayBuffer())

  let raw: RawLawsRoot
  // 判斷是否為 ZIP（PK 簽名）
  if (buf[0] === 0x50 && buf[1] === 0x4b) {
    const jsonText = extractJsonFromZip(buf)
    raw = JSON.parse(jsonText) as RawLawsRoot
  } else {
    raw = JSON.parse(buf.toString('utf-8')) as RawLawsRoot
  }

  const map = new Map<string, RawLaw>()
  for (const law of raw.Laws) {
    const pcode = extractPcode(law.LawURL)
    if (pcode) map.set(pcode, law)
  }

  cachedLawsByPcode = map
  return map
}

function extractPcode(lawUrl: string): string | null {
  try {
    return new URL(lawUrl).searchParams.get('pcode')
  } catch {
    return null
  }
}

// ── 縮排級距偵測 ──

/** 從 heading 字串估算縮排層級（4 格為一級） */
function getIndentLevel(text: string): number {
  const match = text.match(/^(\s*)/)
  if (!match || !match[1]) return 0
  return Math.round(match[1].length / 4)
}

// ── 樹狀結構解析 ──

function buildBody(rawArticles: RawArticle[]): LawNode[] {
  const root: LawNode[] = []
  // stack 儲存每個層級最近的 heading 節點
  const stack: LawNode[] = []

  for (const item of rawArticles) {
    if (item.ArticleType === 'C') {
      const level = getIndentLevel(item.ArticleContent)
      const node: LawNode = {
        type: 'heading',
        name: item.ArticleContent.trim(),
        level,
        children: [],
      }

      // 退棧到嚴格小於當前 level 的父節點
      while (stack.length > 0) {
        const top = stack[stack.length - 1]!
        if ((top.level ?? 0) < level) break
        stack.pop()
      }

      if (stack.length === 0) {
        root.push(node)
      } else {
        stack[stack.length - 1]!.children.push(node)
      }
      stack.push(node)
    } else if (item.ArticleType === 'A' && item.ArticleNo) {
      const article: LawNode = {
        type: 'article',
        no: item.ArticleNo.trim(),
        content: item.ArticleContent.trim(),
        children: [],
      }
      if (stack.length === 0) {
        root.push(article)
      } else {
        stack[stack.length - 1]!.children.push(article)
      }
    }
  }

  return root
}

// ── 日期與資料映射 ──

function formatDateISO(raw: string): string {
  const match = raw.trim().match(/^(\d{4})(\d{2})(\d{2})$/)
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`
  }
  return raw
}

function mapRawToLawContent(raw: RawLaw, entry: LawEntry): LawContent {
  const articles = Array.isArray(raw.LawArticles)
    ? (raw.LawArticles as RawArticle[])
    : raw.LawArticles.Article

  return {
    pcode: entry.pcode,
    name: raw.LawName.trim(),
    customCategory: entry.customCategory,
    lawLevel: raw.LawLevel.trim(),
    isAbolished: !!(raw.LawAbandonNote && raw.LawAbandonNote.trim().length > 0),
    lastSynced: new Date().toISOString().split('T')[0]!,
    lastAmended: formatDateISO(raw.LawModifiedDate.trim()),
    body: buildBody(articles),
  }
}

// ── 檔案 I/O ──

const __dirname = dirname(fileURLToPath(import.meta.url))
const CONTENT_DIR = join(__dirname, '..', 'content', 'laws')

function readExisting(pcode: string): LawContent | null {
  const filePath = join(CONTENT_DIR, `${pcode}.json`)
  if (!existsSync(filePath)) return null
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8')) as LawContent
  } catch {
    console.warn(`  ⚠ 讀取既有檔案失敗：${filePath}，將重新下載`)
    return null
  }
}

function writeContent(content: LawContent): void {
  if (!existsSync(CONTENT_DIR)) {
    mkdirSync(CONTENT_DIR, { recursive: true })
  }
  const filePath = join(CONTENT_DIR, `${content.pcode}.json`)
  writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n', 'utf-8')
}

// ── 主流程 ──

interface SyncStats {
  total: number
  updated: number
  skipped: number
  notFound: number
  error: number
}

async function main() {
  console.log('📡 下載全國法規資料庫 JSON ...')
  const allLaws = await fetchAllLaws()
  console.log(`   取得 ${allLaws.size} 筆法規\n`)

  const stats: SyncStats = {
    total: laws.length,
    updated: 0,
    skipped: 0,
    notFound: 0,
    error: 0,
  }

  for (const entry of laws) {
    const raw = allLaws.get(entry.pcode)

    if (!raw) {
      console.log(`  ${entry.pcode}  ✗ 找不到（確認 pcode 是否正確，或屬於命令位階）`)
      stats.notFound++
      continue
    }

    try {
      const existing = readExisting(entry.pcode)
      const rawDate = formatDateISO(raw.LawModifiedDate.trim())

      if (existing && existing.lastAmended === rawDate) {
        console.log(`  ${entry.pcode}  - ${raw.LawName.trim()}（無變動，跳過）`)
        stats.skipped++
        continue
      }

      const content = mapRawToLawContent(raw, entry)
      writeContent(content)
      console.log(
        `  ${entry.pcode}  ✓ ${content.name}（${content.body.length} 個頂層節點、異動日 ${rawDate}）`,
      )
      stats.updated++
    } catch (err) {
      console.error(
        `  ${entry.pcode}  ✗ 處理失敗：${err instanceof Error ? err.message : String(err)}`,
      )
      stats.error++
    }
  }

  console.log(`\n── 同步摘要 ──`)
  console.log(
    `  總計：${stats.total}  更新：${stats.updated}  無變動：${stats.skipped}  找不到：${stats.notFound}  錯誤：${stats.error}`,
  )
}

main().catch((err) => {
  console.error('同步失敗：', err)
  process.exit(1)
})
