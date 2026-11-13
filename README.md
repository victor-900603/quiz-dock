# QuizDock

個人題庫練習網站。把 JSON 題庫變成可跨裝置練習的網站，提供即時解析、標記與正確率統計。

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

## 部署

推送 `main` 後，GitHub Actions 會執行 lint、測試、建置並部署到 GitHub Pages。Pages 的 Source 已設為「GitHub Actions」。建置時會將 React、Supabase 與 React Query 拆成獨立 vendor chunk。

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
src/schemas         JSON 匯入驗證 schema
src/test            測試用 fake Supabase 與 setup
src/types           型別定義
supabase/migrations 資料庫 migration
supabase/tests      RLS smoke test
docs                正式文件
```

`sdd/` 為本機規劃文件，不進版控。
