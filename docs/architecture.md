# 系統架構

QuizDock 是單頁應用程式（SPA）。前端部署於 GitHub Pages，資料、驗證與統計全部由 Supabase 提供。P0 不設自有後端服務。

## 技術組成

| 層級 | 技術 |
| --- | --- |
| 建置 | Vite 8、TypeScript |
| 介面 | React 19、React Router 7、Tailwind CSS 4 |
| 資料請求 | TanStack Query 5 |
| 後端服務 | Supabase Auth、PostgreSQL、PostgREST、RLS、RPC、View |
| PWA | vite-plugin-pwa、Workbox、@vite-pwa/assets-generator |
| 測試 | Vitest、Testing Library、jsdom、fake Supabase |
| 部署 | GitHub Actions、GitHub Pages |

## 前端分層

```text
src/main.tsx
  ├─ registerSW、initInstallPrompt
  └─ QueryClientProvider
      └─ BrowserRouter
          └─ App
              ├─ AuthProvider
              │   └─ AppRoutes
              │       ├─ 公開路由：/login、/signup、/auth/callback
              │       └─ 受保護路由：AppShell
              │           ├─ /                  LibraryPage
              │           ├─ /sets/:setId       SetDetailPage
              │           ├─ /practice/:id      PracticePage
              │           ├─ /results/:id       ResultsPage
              │           ├─ /marks             MarksPage
              │           ├─ /stats             StatsPage
              │           └─ /settings          SettingsPage
              └─ UpdatePrompt
```

`AppShell` 與 `AuthLayout` 會渲染 `OfflineNotice`，離線時在內容頂端顯示提示。

### `src/features`

每個功能模組分成三層：

- 頁面元件：處理畫面、互動與錯誤狀態。
- `queries.ts`：TanStack Query 的 query key、查詢與 mutation，負責快取更新與失效。
- `*Service.ts`：直接呼叫 Supabase，負責資料列到前端型別的轉換。

功能模組：

| 模組 | 責任 |
| --- | --- |
| `auth` | Email 密碼登入、登出、session 狀態 |
| `library` | 題庫列表、詳情、匯入、重新命名、刪除 |
| `practice` | 開始練習、作答、修改答案、練習摘要 |
| `marks` | 標記題目、取消標記、標記列表 |
| `stats` | 題庫、主題、每日活動與場次統計 |
| `settings` | 帳號資訊、登出、版本與安裝說明 |

### `src/lib`

- `supabase.ts`：建立 Supabase client。
- `env.ts`：讀取與驗證 `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`。
- `errors.ts`：將 Supabase 錯誤轉成一致的中文訊息。
- `router.ts`：依 GitHub Pages 的 base path 計算 router basename。
- `dates.ts`、`format.ts`、`cn.ts`：日期、格式化與 class 合併工具。

### `src/components`

跨頁面重用的介面元件，例如 `AppShell`、`Button`、`Card`、`Modal`、`QuestionCard`、`QuestionNavigator`、`StatCard`。

### `src/pwa`

- `pwaStore.ts`：保存是否有新版本與 `updateSW`，供更新提示訂閱。
- `installPrompt.ts`：攔截 `beforeinstallprompt`、處理 `appinstalled` 與觸發安裝提示。
- `device.ts`：判斷 standalone 顯示模式與 iOS 裝置。
- `useOnlineStatus.ts`、`useInstallPrompt.ts`：包裝瀏覽器狀態給 React 使用。
- `UpdatePrompt.tsx`：固定於畫面下方的版本更新提示。
- `OfflineNotice.tsx`：離線狀態提示。

### `src/data` 與 `src/test`

`src/data/mock.ts` 僅作為測試 fixture。`src/test/fakeSupabase.ts` 模擬 PostgREST 查詢、RPC 與統計 view，讓整合測試不需連線正式資料庫。正式站不會載入這些模組。

## 路由與存取控制

| 路徑 | 頁面 | 存取 |
| --- | --- | --- |
| `/login` | 登入 | 公開 |
| `/signup` | 重新導向 `/login` | 公開，P0 不開放註冊 |
| `/auth/callback` | 重新導向 `/` | 公開 |
| `/` | 題庫列表 | 需登入 |
| `/sets/:setId` | 題庫詳情 | 需登入 |
| `/practice/:sessionId` | 練習 | 需登入 |
| `/results/:sessionId` | 練習摘要 | 需登入 |
| `/marks` | 標記列表 | 需登入 |
| `/stats` | 學習統計 | 需登入 |
| `*` | 找不到頁面 | 公開 |

`RequireAuth` 在 `AuthProvider` 載入 session 期間顯示載入狀態；未登入時導向 `/login?next=<原本路徑>`。

前端路由保護僅影響操作體驗，實際資料權限由資料庫 RLS 決定。

## 資料流

### 登入

1. `AuthProvider` 啟動時呼叫 `supabase.auth.getSession()`。
2. 訂閱 `onAuthStateChange`，同步 session 與 user。
3. `LoginPage` 呼叫 `signInWithPassword`。
4. 登入成功後依 `next` 參數導回原頁面。
5. `SettingsPage` 登出後清除 Query cache 並導向 `/login`。

### 題庫與匯入

1. `LibraryPage` 使用 `useSetsQuery` 取得題庫列表。
2. `fetchSets` 讀取 `quiz_sets`，再分頁讀取 `questions` 的主題與數量。
3. 匯入時 `normalizeImport` 驗證 JSON、計算 `source_hash` 與 `content_hash`。
4. `importQuizSet` 先檢查重複來源，建立題庫後以每批 200 筆 upsert 題目。
5. 匯入失敗時刪除剛建立的題庫，避免留下半成品。
6. mutation 成功後失效 `library` 相關 query。

### 練習

1. `start_practice_session` 建立或取回每位使用者每個題庫的唯一 session。
2. `PracticePage` 依 `question_order` 顯示題目，使用 `submit_answer` 作答。
3. `submit_answer` 在同一交易內新增或更新 attempt，並重算 session 計數與狀態。
4. 前端收到結果後直接更新 session cache，再失效練習列表。
5. 重新開始或切換模式時，RPC 刪除該 session 的 attempts 並重設狀態。

### 標記

1. `useMarksQuery` 讀取 `question_marks`，再組出題目與題庫資訊。
2. `useToggleMarkMutation` 採樂觀更新，先修改 cache，失敗時回復。
3. mutation 結束後失效 `marks` query，與伺服器狀態對齊。

### 統計

1. `fetchStatsOverview` 並行讀取 `v_set_stats`、`v_topic_stats`、`v_daily_activity`、`v_session_summary`。
2. 以 `quiz_sets` 補上題庫標題與主題顯示名稱。
3. 每日活動固定輸出最近 14 天，缺少資料的日期補零。
4. view 使用 `security_invoker`，只會回傳目前使用者有權限的資料。

## Query Key

| 模組 | Key |
| --- | --- |
| library | `['library', 'sets']`、`['library', 'set', setId]` |
| practice | `['practice', 'sessions']`、`['practice', 'session', sessionId]` |
| marks | `['marks']` |
| stats | `['stats', 'overview']`、`['stats', 'set', setId]` |

## 錯誤處理

`describeSupabaseError` 將常見錯誤分類：

- RLS、權限、JWT 問題：顯示重新登入提示。
- 網路或 fetch 失敗：顯示網路檢查提示。
- 其他錯誤：使用呼叫端提供的預設訊息。

服務層統一將 Supabase 錯誤轉為 `Error`，頁面層負責顯示 `role="alert"` 或錯誤狀態。

## 打包策略

`vite.config.ts` 使用 `manualChunks` 將 vendor 拆分為：

- `react-vendor`：`react`、`react-dom`、`scheduler`、`react-router`、`react-router-dom`。
- `supabase-vendor`：`@supabase/*`。
- `query-vendor`：`@tanstack/*`。
- 其餘應用程式碼留在主要 entry chunk。

目的是讓第三方依賴可獨立快取，並避免單一 chunk 過大。

## PWA

### Manifest 與圖示

`vite-plugin-pwa` 在 production build 產生 `manifest.webmanifest` 與 `sw.js`。Manifest 使用 `registerType: 'prompt'`、`display: 'standalone'`、`theme_color` 與 `background_color` 皆為 `#f6f1e7`，`start_url` 與 `scope` 依 `base` 自動指向 GitHub Pages 的專案路徑。

圖示來源為 `public/favicon.svg`，由 `pwa-assets.config.ts` 與 `@vite-pwa/assets-generator` 產生：

- `pwa-64x64.png`、`pwa-192x192.png`、`pwa-512x512.png`
- `maskable-icon-512x512.png`
- `apple-touch-icon-180x180.png`
- `favicon.ico`

修改來源圖示後執行 `npm run pwa:assets`，再將產生的檔案一併提交。

### 快取策略

Workbox 使用 `generateSW` 模式：

- 預先快取 HTML、JS、CSS、字型、圖片與 manifest 圖示。
- `navigateFallback` 指向 `index.html`，離線時深層連結仍可開啟 SPA。
- Google Fonts 樣式使用 `StaleWhileRevalidate`，`fonts.gstatic.com` 字型檔使用 `CacheFirst`，最多 8 筆、保留 365 天。
- Supabase 請求不納入快取，避免跨使用者或過期資料被 Service Worker 回傳。
- 啟用 `cleanupOutdatedCaches`，避免舊版 precache 持續累積。

離線範圍僅限 App 外殼。`QueryClient` 的 query 與 mutation 使用 `networkMode: 'always'`，離線時直接進入錯誤狀態，不會無限期暫停請求。

### 更新流程

1. `src/main.tsx` 以 `virtual:pwa-register` 註冊 Service Worker。
2. 偵測到 waiting worker 時，`onNeedRefresh` 將 `updateSW` 寫入 `pwaStore`。
3. `UpdatePrompt` 顯示「重新載入」與「稍後」。重新載入會呼叫 `updateSW(true)` 並啟用新版本。
4. `onRegisteredSW` 每小時呼叫 `registration.update()` 檢查新版本。
5. 使用者選擇稍後時僅關閉提示，不會自動重新載入。

### 安裝與安全區域

- `installPrompt.ts` 攔截 `beforeinstallprompt`，保存瀏覽器提供的安裝事件；`appinstalled` 後標記為已安裝。
- `SettingsPage` 的安裝卡片依序判斷：已安裝、可安裝、iOS、一般手動安裝。
- iOS 顯示 Safari 分享選單的「加入主畫面」說明。
- `index.html` 設定 `viewport-fit=cover` 與 Apple PWA meta；`index.css` 以 `env(safe-area-inset-top)` 保留瀏海安全區域。底部導覽與更新提示另外處理 `safe-area-inset-bottom`。

## 測試策略

- 單元測試：服務層的資料轉換、錯誤處理、日期與格式化工具。
- PWA 測試：更新狀態、安裝事件、裝置判斷、離線狀態、更新提示與設定頁安裝卡片。
- 整合測試：以 `fakeSupabase` 模擬資料庫，透過 Testing Library 操作完整頁面流程。
- RLS smoke test：`supabase/tests/rls.sql` 手動對遠端資料庫執行，驗證跨帳號隔離。
- 覆蓋率門檻：statements、branches、functions、lines 皆為 80%。

## 部署流程

`.github/workflows/deploy.yml` 在推送 `main` 或手動觸發時執行：

1. `npm ci`
2. `npm run lint`
3. `npm run test:coverage`
4. `npm run build`，注入 `VITE_SUPABASE_URL` 與 `VITE_SUPABASE_ANON_KEY`
5. 上傳 `dist` 並部署到 GitHub Pages

建置產物包含 `manifest.webmanifest`、`sw.js`、`workbox-*.js` 與 PWA 圖示。Service Worker 只在 production build 產生，本機需以 `npm run preview` 驗證。

`vite.config.ts` 依 `GITHUB_REPOSITORY` 決定 base path；專案站台使用 `/<repo>/`，使用者站台使用 `/`。Manifest 的 `start_url`、`scope` 與 Service Worker 註冊路徑會跟著 base path 調整。
