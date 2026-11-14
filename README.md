# QuizDock

個人題庫練習網站。把 JSON 題庫變成可跨裝置練習的網站，提供即時解析、標記與正確率統計，並可安裝為 PWA。

目前狀態：P0 已完成。前端部署於 GitHub Pages，登入、題庫列表、題庫詳情、JSON 匯入、重新命名、刪除、練習流程、作答紀錄、標記與統計全部使用 Supabase。正式站不含 mock 資料；測試使用獨立的 fake Supabase 與題庫 fixture。P0 不開放公開註冊，帳號由站長建立。

正式站：`https://victor-900603.github.io/quiz-dock/`

## 開發

```bash
npm install
npm run dev
```

## 指令

```bash
npm run dev            # 本機開發
npm run build          # 型別檢查與打包
npm run preview        # 預覽打包結果
npm run lint           # ESLint
npm run test           # Vitest
npm run test:coverage  # 測試覆蓋率
npm run pwa:assets     # 由 favicon.svg 重新產生 PWA 圖示
npm run db:push        # 套用 Supabase migration
npm run db:types       # 產生 Supabase 資料庫型別
```

## 環境變數

複製 `.env.example` 為 `.env.local`，填入 Supabase 專案資訊。登入與所有資料層需要 `VITE_SUPABASE_URL` 與 `VITE_SUPABASE_ANON_KEY`。

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

只使用 anon public key。`service_role` key 不得放在前端或 `VITE_` 環境變數。

## PWA

正式建置會產生 `manifest.webmanifest`、`sw.js` 與 Workbox runtime，並由 `vite-plugin-pwa` 註冊 Service Worker。

- 離線範圍僅限 App 外殼：HTML、JS、CSS、字型與圖片會預先快取。Supabase 請求不快取，離線時仍需網路才能讀取或儲存資料。
- 偵測到新版本時，畫面下方會顯示更新提示；選擇「重新載入」後才切換到新版本，選擇「稍後」可繼續使用目前版本。註冊後每小時檢查一次更新。
- 設定頁的「安裝」卡片會依瀏覽器狀態顯示安裝按鈕、iOS 加入主畫面說明或一般安裝說明。
- 圖示來源為 `public/favicon.svg`，由 `pwa-assets.config.ts` 產生 64、192、512、maskable 與 Apple Touch Icon。修改圖示後執行 `npm run pwa:assets`。

Service Worker 只在 production build 產生。本機驗證請執行 `npm run build` 後再以 `npm run preview` 開啟。

## 部署

推送 `main` 後，GitHub Actions 會執行 lint、測試、建置並部署到 GitHub Pages。Pages 的 Source 已設為「GitHub Actions」。建置時會將 React、Supabase 與 React Query 拆成獨立 vendor chunk，並輸出 PWA manifest 與 Service Worker。

## 文件

- [`docs/setup.md`](docs/setup.md)：Supabase 專案、migration、Auth、環境變數與 RLS smoke test。
- [`docs/database.md`](docs/database.md)：資料表、view、RPC、RLS 與 migration 順序。
- [`docs/architecture.md`](docs/architecture.md)：前端分層、路由、資料流、測試與部署。

## 目錄

```text
.github/workflows   GitHub Pages 部署 workflow
src/components      共用介面元件
src/data            測試用題庫 fixture
src/features        頁面與功能模組（auth、library、practice、marks、stats、settings）
src/lib             共用工具、Supabase client 與 router 工具
src/pwa             PWA 註冊狀態、安裝提示、離線與更新介面
src/schemas         JSON 匯入驗證 schema
src/test            測試用 fake Supabase 與 setup
src/types           型別定義
public              favicon 與產生的 PWA 圖示
supabase/migrations 資料庫 migration
supabase/tests      RLS smoke test
docs                正式文件
```

`sdd/` 為本機規劃文件，不進版控。
