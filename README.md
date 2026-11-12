# QuizDock

個人題庫練習網站。目標是把 JSON 題庫變成可跨裝置練習的網站，保留即時解析、標記與正確率統計。

目前狀態：前端介面預覽。使用 4 份 mock 題庫、共 76 題的資料，尚未接上 Supabase。GitHub Pages workflow 已建立，尚未完成首次部署。

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
```

## 環境變數

複製 `.env.example` 為 `.env`，填入 Supabase 專案資訊。前端介面預覽不需要環境變數。

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## 部署

推送 `main` 後，GitHub Actions 會執行 lint、測試、建置並部署到 GitHub Pages。首次使用需在 repo 的 Settings → Pages 將 Source 設為「GitHub Actions」。

## 目錄

```text
.github/workflows   GitHub Pages 部署 workflow
src/components      共用介面元件
src/data            mock 資料
src/features        頁面與功能模組
src/lib             共用工具與 mock store
src/types           型別定義
supabase/migrations 資料庫 migration（尚未建立）
docs                正式文件（尚未建立）
```

`sdd/` 為本機規劃文件，不進版控。
