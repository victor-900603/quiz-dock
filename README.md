# QuizDock

個人題庫練習網站。目標是把 JSON 題庫變成可跨裝置練習的網站，保留即時解析、標記與正確率統計。

目前狀態：前端已部署到 GitHub Pages，Supabase Auth 已接上；題庫、練習與統計仍使用 4 份 mock 題庫、共 76 題的資料。P0 不開放公開註冊，帳號由站長建立。

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

複製 `.env.example` 為 `.env.local`，填入 Supabase 專案資訊。登入功能需要 `VITE_SUPABASE_URL` 與 `VITE_SUPABASE_ANON_KEY`。

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Supabase 專案、CLI、migration、Auth 與 RLS 設定請見 [`docs/setup.md`](docs/setup.md)。

## 部署

推送 `main` 後，GitHub Actions 會執行 lint、測試、建置並部署到 GitHub Pages。Pages 的 Source 已設為「GitHub Actions」。

## 目錄

```text
.github/workflows   GitHub Pages 部署 workflow
src/components      共用介面元件
src/data            mock 資料
src/features        頁面與功能模組
src/lib             共用工具與 mock store
src/types           型別定義
supabase/migrations 資料庫 migration
supabase/tests      RLS smoke test
docs                正式文件
```

`sdd/` 為本機規劃文件，不進版控。
