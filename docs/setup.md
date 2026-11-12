# Supabase 設定

這份文件說明 QuizDock 的 Supabase 專案建立、migration、Auth 與環境變數設定。P0 使用 Email + 密碼登入，資料庫透過 RLS 隔離使用者資料。

## 前置需求

- Node.js 22
- npm
- Supabase 帳號
- 已建立的 GitHub repo

## 1. 建立 Supabase 專案

1. 登入 Supabase Dashboard。
2. 建立新專案，名稱使用 `quiz-dock`。
3. Region 選擇東京 `ap-northeast-1`；若東京無法選用，再改新加坡 `ap-southeast-1`。
4. 建立完成後，從 Project Settings → API 取得：
   - Project URL
   - anon public key
   - Project ref，位於專案網址 `https://supabase.com/dashboard/project/<project-ref>`
5. 資料庫密碼只在本機輸入，不要提交到 repo，也不要貼在公開對話中。

## 2. 連結 Supabase CLI

Supabase CLI 已列為 devDependency，先安裝依賴：

```bash
npm install
```

登入並連結專案：

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
```

`supabase link` 會要求輸入資料庫密碼。連結資訊會存放在 `supabase/.temp/`，這個目錄已被 `supabase/.gitignore` 排除。

## 3. 執行 migration

Migration 位於 `supabase/migrations/`，依序為：

```text
20261112051843_schema.sql
20261112051847_rls.sql
20261112051850_rpc.sql
20261112051853_views.sql
```

推到遠端資料庫：

```bash
npm run db:push
```

確認套用狀態：

```bash
npx supabase migration list
```

四支 migration 分別負責：

- schema：資料表、索引、`updated_at` trigger。
- rls：啟用 RLS、policies 與資料表 grants。
- rpc：`start_practice_session`、`submit_answer`。
- views：`v_set_stats`、`v_topic_stats`、`v_daily_activity`、`v_session_summary`。

## 4. Auth 設定

到 Authentication → Providers → Email：

- 啟用 Email provider。
- P0 先關閉 Confirm email，避免 SMTP 限制。

到 Authentication → URL Configuration：

- Site URL：`https://victor-900603.github.io/quiz-dock/`
- Redirect URLs：
  - `http://localhost:5174/auth/callback`
  - `https://victor-900603.github.io/quiz-dock/auth/callback`

建立兩個帳號：

- 站長帳號
- RLS 測試帳號

建立完成後，到 Authentication → Settings 關閉 `Allow new users to sign up`。P0 不開放公開註冊；前端也不會顯示註冊入口。

## 5. 環境變數

複製 `.env.example` 為 `.env.local`，填入 Supabase 專案資訊：

```bash
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

`.env.local` 已被 `.gitignore` 排除，不會進版控。

GitHub Actions 需要相同的兩個值。到 GitHub repo → Settings → Secrets and variables → Actions，新增：

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

只使用 anon public key。`service_role` key 不得放在前端或 `VITE_` 環境變數。

## 6. 產生資料庫型別

確認已 `supabase link` 後執行：

```bash
npm run db:types
```

輸出會寫入 `src/types/database.ts`。若 CLI 回報未連結，先重新執行 `npx supabase link --project-ref <project-ref>`。

## 7. RLS smoke test

`supabase/tests/rls.sql` 是手動測試，不會在 CI 自動執行。使用方式：

1. 到 Authentication → Users 取得站長與測試帳號的 UUID。
2. 將檔案中的 `OWNER_UUID`、`TESTER_UUID` 換成實際 UUID。
3. 在 Supabase SQL Editor 貼上完整內容執行。
4. 測試以 `begin;` 開始、`rollback;` 結束，不會留下測試資料。

測試會驗證：

- 站長可讀取自己的私有與公開題庫。
- 測試帳號只看得到公開題庫與題目。
- 測試帳號看不到站長的 session、attempt、mark。
- 測試帳號不能寫入站長的私有題庫、session 或私有題目標記。
- 測試帳號可以標記公開題目。
- 未登入的 anon 只能讀取公開題庫與題目。

## 8. 常見問題

### `supabase link` 失敗

確認 project ref 正確，並使用 Dashboard 顯示的資料庫密碼。若忘記密碼，可在 Project Settings → Database 重設。

### `db push` 沒有套用 migration

確認 migration 檔名為 timestamp 格式，且 `supabase migration list` 可以看到遠端版本。不要直接修改已套用的 migration；新增修正請建立新的 migration。

### `db:types` 沒有輸出

`db:types` 使用 `--linked`，必須先完成 `supabase link`。輸出檔 `src/types/database.ts` 應一併提交。

### GitHub Actions 建置成功但網站沒有資料

確認 GitHub Secrets 已設定，且 Pages workflow 是在 Secrets 設定後重新執行。Secrets 不會自動套用到舊的 workflow run。
