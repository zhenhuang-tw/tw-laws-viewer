# 雲端法條本 (Taiwan Laws Viewer)

從[全國法規資料庫](https://law.moj.gov.tw/)擷取國考及個人學習常用法規，以純靜態部署於 Cloudflare Pages，俾快速查閱。

## 功能

- **分類瀏覽**：依民法、刑法、商法、憲法、行政法等分類整理法規
- **全文閱讀**：章節索引 + 條文內文，支援條號跳轉
- **即時搜尋**：左欄搜尋框可快速篩選法規名稱
- **響應式佈局**：全寬三欄、半寬雙欄、手機單欄三種模式自動切換
- **亮/暗主題**。
- **靜態部署**：全國法規資料庫每次均須動態查詢，需要較長時間載入。本專案則為純靜態部署，且使用 Cloudflare 的服務來加速。

## 技術棧

| 項目     | 選擇                                             |
| -------- | ------------------------------------------------ |
| 框架     | Nuxt 4 + TypeScript                              |
| 內容層   | @nuxt/content v3                                 |
| 樣式     | Pico CSS class-less + 自訂 CSS                   |
| 部署     | Cloudflare Pages（純靜態）                       |
| 資料同步 | GitHub Actions 每週排程從全國法規資料庫 API 獲取 |

## 開發

```bash
# 安裝依賴
pnpm install

# 啟動開發伺服器
pnpm dev

# 同步法規資料（從全國法規資料庫 API 下載）
pnpm sync

# 靜態建置
pnpm generate
```

## 自訂法規清單

編輯 `config/laws.config.ts`，新增或移除 `laws` 陣列中的條目：

```ts
{ pcode: 'B0000001', customCategory: '民法' }
```

- `pcode`：至[全國法規資料庫](https://law.moj.gov.tw/)查詢法規，網址中的 `?pcode=...` 即為代碼
- `customCategory`：對應左欄分類標題；未列於 `categoryOrder` 的分類會自動附加在最後

## 授權

法規內容來自[全國法規資料庫](https://law.moj.gov.tw/)，依[政府資料開放授權條款-第1版](https://data.gov.tw/license)使用（法務部[政府網站資料開放宣告](https://law.moj.gov.tw/Service/Copyright.aspx)參照）。
