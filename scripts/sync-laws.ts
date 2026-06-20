import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { inflateRawSync } from 'node:zlib'
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
  effectiveNote?: string
  lawUrl?: string
  body: LawNode[]
}

// ── ZIP 解壓縮 — 掃描全部條目，找出 .json 檔，支援 store/deflate ──

/** 從 ZIP buffer 找出檔名結尾為 .json 的檔案並回傳內容。 */
function extractJsonFromZip(zipBuf: Buffer): string {
  const LOCAL_SIG = 0x04034b50 // "PK\x03\x04" little-endian
  const CENTRAL_SIG = 0x02014b50 // "PK\x01\x02" little-endian

  console.log(`  📦 ZIP 總大小：${zipBuf.length} bytes`)

  // ── 1. 掃描所有 local file header，收集條目資訊 ──
  interface ZipEntry {
    name: string
    dataOffset: number
    compression: number
    compressedSize: number
    uncompressedSize: number
  }
  const entries: ZipEntry[] = []

  for (let off = 0; off < zipBuf.length - 30; off++) {
    if (zipBuf.readUInt32LE(off) !== LOCAL_SIG) continue

    const compression = zipBuf.readUInt16LE(off + 8)
    const compressedSize = zipBuf.readUInt32LE(off + 18)
    const uncompressedSize = zipBuf.readUInt32LE(off + 22)
    const fileNameLen = zipBuf.readUInt16LE(off + 26)
    const extraLen = zipBuf.readUInt16LE(off + 28)
    if (off + 30 + fileNameLen > zipBuf.length) break

    const name = zipBuf.subarray(off + 30, off + 30 + fileNameLen).toString('utf-8')
    const dataOffset = off + 30 + fileNameLen + extraLen

    console.log(
      `    📄 "${name}" 壓縮方式=${compression} 壓縮大小=${compressedSize} 原始大小=${uncompressedSize}`,
    )

    entries.push({ name, dataOffset, compression, compressedSize, uncompressedSize })
    off = dataOffset + Math.max(compressedSize, uncompressedSize, 1) - 1
  }

  // ── 2. 若 local header 的 compressedSize 為 0，從 central directory 補正 ──
  for (let off = 0; off < zipBuf.length - 46; off++) {
    if (zipBuf.readUInt32LE(off) !== CENTRAL_SIG) continue

    const cdCompressedSize = zipBuf.readUInt32LE(off + 20)
    const cdUncompressedSize = zipBuf.readUInt32LE(off + 24)
    const cdFileNameLen = zipBuf.readUInt16LE(off + 28)
    const cdExtraLen = zipBuf.readUInt16LE(off + 30)
    const cdCommentLen = zipBuf.readUInt16LE(off + 32)
    if (off + 46 + cdFileNameLen > zipBuf.length) break

    const cdName = zipBuf.subarray(off + 46, off + 46 + cdFileNameLen).toString('utf-8')
    const entry = entries.find((e) => e.name === cdName)
    if (entry && entry.compressedSize === 0 && cdCompressedSize > 0) {
      console.log(`    🔧 補正 "${cdName}" 大小 → ${cdCompressedSize}`)
      entry.compressedSize = cdCompressedSize
      entry.uncompressedSize = cdUncompressedSize
    }

    off += 46 + cdFileNameLen + cdExtraLen + cdCommentLen - 1
  }

  // ── 3. 找出 .json 條目並解壓縮 ──
  const target = entries.find((e) => e.name.endsWith('.json'))
  if (!target) {
    const names = entries.map((e) => e.name).join(', ')
    throw new Error(`ZIP 內找不到 .json 檔案。條目：${names}`)
  }

  console.log(`  🎯 選取目標："${target.name}"`)

  if (target.compressedSize === 0) {
    throw new Error(
      `"${target.name}" 的 compressedSize 為 0，無法讀取（可能需從 central directory 補正）`,
    )
  }

  const data = zipBuf.subarray(target.dataOffset, target.dataOffset + target.compressedSize)

  if (target.compression === 0) {
    // 無壓縮（store）
    console.log(`  📄 無壓縮，直接讀取 ${data.length} bytes`)
    return data.toString('utf-8')
  }

  if (target.compression === 8) {
    // deflate 壓縮
    console.log(`  🗜️ deflate 解壓縮：${data.length} → 預估 ${target.uncompressedSize} bytes`)
    return inflateRawSync(data).toString('utf-8')
  }

  throw new Error(`不支援的壓縮方式：${target.compression}`)
}

// ── API 型別 — 對應全國法規資料庫 JSON 端點回傳結構 ──

const API_URL = 'https://law.moj.gov.tw/api/ch/law/json'

interface RawArticle {
  ArticleType: 'C' | 'A' // C = 章節標題（含編/章/節/款）, A = 條文
  ArticleNo?: string // 條號，僅 ArticleType='A' 時有值
  ArticleContent: string // 條文內容或章節標題文字
}

interface RawLaw {
  LawLevel: string // 法規位階，如「法律」「憲法」
  LawName: string // 法規名稱
  LawURL: string // 全國法規資料庫連結（內含 pcode）
  LawCategory: string // 法規分類路徑
  LawModifiedDate: string // 最後異動日期，格式 YYYYMMDD
  LawAbandonNote?: string // 非空 = 已廢止
  LawEffectiveNote?: string // 生效註記（如特定條文另定施行日期）
  LawArticles: { Article: RawArticle[] } | RawArticle[]
}

interface RawLawsRoot {
  UpdateDate: string // 資料更新時間
  Laws: RawLaw[]
}

// ── API 互動 — 下載整包 JSON（可能包在 ZIP 內），建立 pcode 查詢表 ──

let cachedLawsByPcode: Map<string, RawLaw> | null = null

async function fetchAllLaws(): Promise<Map<string, RawLaw>> {
  if (cachedLawsByPcode) return cachedLawsByPcode

  console.log('  🌐 請求 API …')
  const res = await fetch(API_URL, { headers: { Accept: 'application/json' } })
  if (!res.ok) {
    throw new Error(`下載失敗：HTTP ${res.status}`)
  }

  const contentType = res.headers.get('content-type') ?? ''
  console.log(`  📨 Content-Type: ${contentType}`)

  const buf = Buffer.from(await res.arrayBuffer())
  console.log(
    `  📥 回應大小：${buf.length} bytes，前 4 bytes：${buf.subarray(0, 4).toString('hex')}`,
  )

  let raw: RawLawsRoot

  // 以 PK 簽名（0x50 0x4b）判斷是否為 ZIP
  if (buf.length >= 2 && buf[0] === 0x50 && buf[1] === 0x4b) {
    console.log('  🗜️ 偵測到 ZIP 格式，開始解壓縮 …')
    const jsonText = extractJsonFromZip(buf)
    console.log(`  ✅ JSON 解壓完成，${jsonText.length} 字元`)
    // 去除 UTF-8 BOM（﻿），JSON.parse 不接受
    const clean = jsonText.startsWith('﻿') ? jsonText.slice(1) : jsonText
    raw = JSON.parse(clean) as RawLawsRoot
  } else {
    console.log('  📝 直接解析 JSON …')
    raw = JSON.parse(buf.toString('utf-8')) as RawLawsRoot
  }

  const map = new Map<string, RawLaw>()
  for (const law of raw.Laws) {
    const pcode = extractPcode(law.LawURL)
    if (pcode) map.set(pcode, law)
  }

  console.log(`  📊 共 ${raw.Laws.length} 筆法規，${map.size} 筆可解析 pcode\n`)
  cachedLawsByPcode = map
  return map
}

/** 從 LawURL 的 query string 解析 pcode。 */
function extractPcode(lawUrl: string): string | null {
  try {
    return new URL(lawUrl).searchParams.get('pcode')
  } catch {
    return null
  }
}

// ═══════════════════════════════════════════════════════════════
//  章節層級偵測 — 從 heading 文字的前置縮排空白數判斷之
// ═══════════════════════════════════════════════════════════════

/**
 * 從章節標題字串估算層級。
 * 規則：4 個半形空格 ≈ 一層（編=0, 章=1, 節=2, 款=3, …）
 */
function getIndentLevel(text: string): number {
  const match = text.match(/^(\s*)/)
  if (!match || !match[1]) return 0
  return Math.round(match[1].length / 4)
}

// ── 樹狀結構解析 — 將 API 的 flat 條文列表轉為巢狀 body tree ──

/**
 * 根據 ArticleType 與縮排層級，將 flat 列表轉為巢狀 LawNode 樹。
 * - ArticleType 'C' → heading 節點（依縮排決定父子關係）
 * - ArticleType 'A' → article 節點（掛在當前 stack 頂層 heading 下）
 */
function buildBody(rawArticles: RawArticle[]): LawNode[] {
  const root: LawNode[] = []
  const stack: LawNode[] = [] // 每層目前作用中的 heading

  for (const item of rawArticles) {
    if (item.ArticleType === 'C') {
      // ── 章節標題 ──
      const level = getIndentLevel(item.ArticleContent)
      const node: LawNode = {
        type: 'heading',
        name: item.ArticleContent.trim(),
        level,
        children: [],
      }

      // 退棧：彈出所有層級 ≥ 當前層級的節點，找到父節點
      while (stack.length > 0) {
        const top = stack[stack.length - 1]!
        if ((top.level ?? 0) < level) break
        stack.pop()
      }

      if (stack.length === 0) {
        root.push(node) // 頂層 heading
      } else {
        stack[stack.length - 1]!.children.push(node) // 掛在父 heading 下
      }
      stack.push(node)
    } else if (item.ArticleType === 'A' && item.ArticleNo) {
      // ── 條文 ──
      const article: LawNode = {
        type: 'article',
        no: item.ArticleNo.trim(),
        content: item.ArticleContent.trim(),
        children: [],
      }
      if (stack.length === 0) {
        root.push(article) // 無章節的罕見情況
      } else {
        stack[stack.length - 1]!.children.push(article)
      }
    }
  }

  return root
}

// ── 日期與資料映射 ──

/** 將 YYYYMMDD 轉為 ISO 8601 日期格式 YYYY-MM-DD。 */
function formatDateISO(raw: string): string {
  const match = raw.trim().match(/^(\d{4})(\d{2})(\d{2})$/)
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`
  }
  return raw
}

/** 把一筆 RawLaw 轉換為我們的內部 LawContent 格式。 */
function mapRawToLawContent(raw: RawLaw, entry: LawEntry): LawContent {
  // LawArticles 在少數法規中直接是陣列，多數情況是 { Article: [...] }
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
    effectiveNote: raw.LawEffectiveNote?.trim() || undefined,
    lawUrl: raw.LawURL?.trim() || undefined,
    body: buildBody(articles),
  }
}

// ── 檔案 I/O — 讀寫 content/laws/*.json ──

const __dirname = dirname(fileURLToPath(import.meta.url))
const CONTENT_DIR = join(__dirname, '..', 'content', 'laws')

/** 讀取既有 JSON 檔（用於比對 lastAmended 是否變動）。 */
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

/** 寫入法規內容 JSON。 */
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
  console.log('📡 開始同步全國法規資料庫 …\n')
  const allLaws = await fetchAllLaws()

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
