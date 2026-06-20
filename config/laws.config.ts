// ============================================================
// 雲端法條本 — 法規設定檔
//
// 在這裡新增或移除要收錄的法規。
// 同步腳本會依此清單，從全國法規資料庫 API 下載資料。
//
// pcode：至全國法規資料庫查詢，網址格式如：
//   https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=A0030001
// ============================================================

export interface LawEntry {
  /** 全國法規資料庫法規代碼 */
  pcode: string
  /** 自訂分類（對應左欄的 accordion 標題） */
  customCategory: string
}

/**
 * 左欄 accordion 的分類顯示順序。
 * 列在此陣列中的分類按順序顯示；未列入的分類附加在最後。
 */
export const categoryOrder: string[] = ['民法', '刑法', '商法', '憲法', '行政法', '其他']

export const laws: LawEntry[] = [
  // ── 民法 ────────────────────────────────────────────────────
  { pcode: 'B0000001', customCategory: '民法' }, // 民法
  { pcode: 'B0010001', customCategory: '民法' }, // 民訴
  { pcode: 'B0010048', customCategory: '民法' }, // 家事
  { pcode: 'B0010004', customCategory: '民法' }, // 強執
  { pcode: 'B0000008', customCategory: '民法' }, // 同性結合法

  // ── 刑法 ────────────────────────────────────────────────────
  { pcode: 'C0000001', customCategory: '刑法' }, // 刑法
  { pcode: 'C0010001', customCategory: '刑法' }, // 刑訴
  { pcode: 'A0030320', customCategory: '刑法' }, // 國官

  // ── 商法 ──────────────────────────────────────────────────
  { pcode: 'J0080001', customCategory: '商法' }, // 公司
  { pcode: 'G0400001', customCategory: '商法' }, // 證交
  { pcode: 'G0390002', customCategory: '商法' }, // 保險
  { pcode: 'G0380028', customCategory: '商法' }, // 票據

  // ── 憲法 ────────────────────────────────────────────────────
  { pcode: 'A0000001', customCategory: '憲法' }, // 憲法
  { pcode: 'A0000002', customCategory: '憲法' }, // 憲增
  { pcode: 'A0030159', customCategory: '憲法' }, // 憲訴

  // ── 行政法 ──────────────────────────────────────────────────
  { pcode: 'A0030055', customCategory: '行政法' }, // 行政程序法
  { pcode: 'A0030023', customCategory: '行政法' }, // 行政執行法
  { pcode: 'A0030210', customCategory: '行政法' }, // 行政罰法
  { pcode: 'A0030020', customCategory: '行政法' }, // 訴願法
  { pcode: 'A0030154', customCategory: '行政法' }, // 行政訴訟法
  { pcode: 'I0020004', customCategory: '行政法' }, // 國家賠償法
]
