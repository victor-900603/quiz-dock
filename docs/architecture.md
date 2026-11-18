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
              │           ├─ /sets/:setId/questions  SetQuestionsPage
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
| `library` | 題庫列表、詳情、題目瀏覽與搜尋、匯入、匯出、增量更新、重新命名、刪除 |
| `practice` | 開始練習（全部或錯題、依序或隨機、題數）、作答、修改答案、結束場次、練習摘要、刪除紀錄 |
| `marks` | 標記題目、取消標記、標記列表 |
| `stats` | 題庫、主題、每日活動與場次統計 |
| `settings` | 帳號資訊、登出、閱讀字級、主題、帳號偏好同步（答錯自動標記）、版本與安裝說明 |

`settings/readingScale.ts` 以 `localStorage` 保存閱讀字級（小、標準、大、特大），於 `main.tsx` 啟動時套用到 `document.documentElement`，並以 `useSyncExternalStore` 提供訂閱。題幹、選項與解析使用對應的閱讀字級 class，介面文字不受影響。

`settings/preferences.ts` 定義帳號偏好與預設值，逐欄解析時若格式錯誤會回落預設；`preferencesService.ts` 讀寫 `user_settings`，`queries.ts` 以 `['settings','preferences',userId]` 快取並提供樂觀更新，跨裝置同步。

`settings/theme.ts` 以 `localStorage`（`quizdock.theme`）保存淺色、深色或跟隨系統，預設跟隨系統；`main.tsx` 啟動時套用 `data-theme`、`color-scheme` 與 `theme-color`，並以 `useSyncExternalStore` 提供訂閱。深色主題只覆寫 CSS 變數，不寫入 Supabase。

### `src/lib`

- `supabase.ts`：建立 Supabase client。
- `env.ts`：讀取與驗證 `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`。
- `errors.ts`：將 Supabase 錯誤轉成一致的中文訊息。
- `router.ts`：依 GitHub Pages 的 base path 計算 router basename。
- `dates.ts`、`format.ts`、`cn.ts`：日期、格式化與 class 合併工具。
- `download.ts`：以 Blob 與暫存連結下載文字檔。
- `importSource.ts`：解析 JSON 外層結構、題目欄位別名與選項鍵。
- `csvImport.ts`：解碼 CSV/TSV、偵測分隔符、猜測欄位對應並轉成題目物件。
- `importPreview.ts`：以正式驗證流程產生匯入預覽，與實際匯入共用規則。

### `src/components`

跨頁面重用的介面元件，例如 `AppShell`、`Button`、`Card`、`Modal`、`QuestionCard`、`QuestionNavigator`、`StatCard`。`AnswerReview` 統一題目檢視時的選項與解析樣式，供已標記題目與題目瀏覽共用；`QuestionCopyActions` 在練習、題目瀏覽與已標記題目中複製題幹與選項；`ImportDialog` 與 `SyncDialog` 共用 `JsonSourcePicker` 處理檔案上傳與貼上內容；`ImportDialog` 以 `CsvMappingFields` 讓使用者對應 CSV/TSV 欄位，右上角問號按鈕會開啟 `ImportHelpDialog`，以範例說明格式與常見錯誤；`StartPracticeDialog` 選擇練習範圍、順序與題數；`ActionMenu` 將列表項目的次要操作收合為單一選單。

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
| `/sets/:setId/questions` | 題目瀏覽與搜尋 | 需登入 |
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
3. 匯入時 `JsonSourcePicker` 讀取檔案並解碼；JSON 由 `importSource` 解析外層結構與欄位別名，CSV/TSV 由 `csvImport` 解析表格並讓使用者確認欄位對應。
4. `normalizeImport` 驗證正規化後的題目、解析選項與答案的多種寫法，並計算 `source_hash` 與 `content_hash`。
5. 匯入前的預覽直接呼叫同一套驗證，顯示題數、主題與實際錯誤，不再另外維護寬鬆解析。
6. `importQuizSet` 先檢查重複來源，建立題庫後以每批 200 筆 upsert 題目。
7. 匯入失敗時刪除剛建立的題庫，避免留下半成品。
8. mutation 成功後失效 `library` 相關 query。

### 匯出與更新題庫

1. `SetDetailPage` 的「匯出 JSON」呼叫 `exportQuizSet`，分頁讀取題庫與題目後組成與匯入相同的信封格式，再由 `downloadTextFile` 下載。
2. 「更新題庫」開啟 `SyncDialog`；上傳或貼上 JSON 後，經短暫防抖呼叫 `previewQuizSetSync`。
3. `prepareSync` 以 `normalizeImport` 驗證內容，讀取現有題號與內容雜湊，產生新增、修改、順序調整、移除與未變更清單，並統計受影響的作答與標記數量。
4. 使用者確認後，`syncQuizSet` 更新題庫說明、主題標籤與來源雜湊（不改標題），刪除未出現的題號，再以 `(set_id, question_number)` upsert 其餘題目。
5. 最後呼叫 RPC `sync_practice_session` 重建練習順序，重算既有作答的正確性與 session 計數。
6. 完成後失效所有 query，因為題目、作答、標記與統計都可能改變。

### 題目瀏覽

1. `SetDetailPage` 的「瀏覽題目」導向 `/sets/:setId/questions`；`SetQuestionsPage` 使用 `useSetQuery` 已載入的題庫詳情，不新增查詢。
2. `QuestionBrowser` 以題幹、選項、解析與題號過濾，並可依主題篩選；純數字輸入會比對題號。
3. 過濾使用 `useDeferredValue` 延後計算，每次顯示 20 題，按「載入更多」追加，變更關鍵字或主題時重設。
4. 每題以原生 `<details>` 展開選項、正確答案與解析；標記狀態唯讀顯示。

### 練習

1. 題庫詳情頁沒有進行中場次時，「開始練習」開啟 `StartPracticeDialog`，選擇全部題目或某次已完成練習的錯題、依序或隨機、全部或自訂題數。
2. `start_practice_session` 已有進行中場次時直接回傳；否則驗證來源場次後建立新場次，並記錄 `source_session_id`。
3. `PracticePage` 依 `question_order` 顯示題目，使用 `submit_answer` 作答。
4. `submit_answer` 在同一交易內新增或更新 attempt，並重算該場次計數與狀態。
5. 前端收到結果後直接更新 session cache，再失效練習列表。
6. 若帳號偏好開啟「答錯時自動標記」、本題答錯且尚未標記，前端另外呼叫標記 mutation；結果以 `question_marks` 為準，不影響作答流程，失敗時僅顯示提示。
7. 「結束本場」將場次標記為已完成並保留作答；結果頁「再練一次」沿用相同順序、題數與錯題來源建立新場次，不再清除舊資料。
8. 刪除單筆紀錄會連帶刪除該場 attempts；「清除全部」移除該題庫所有場次。統計與練習列表隨後失效重讀。

### 標記

1. `useMarksQuery` 讀取 `question_marks`，再組出題目與題庫資訊。
2. `useToggleMarkMutation` 採樂觀更新，先修改 cache，失敗時回復。
3. mutation 結束後失效 `marks` query，與伺服器狀態對齊。

### 統計

1. `fetchStatsOverview` 並行讀取 `v_set_stats`、`v_topic_stats`、`v_daily_activity`、`v_session_summary`。
2. 以 `quiz_sets` 補上題庫標題與主題顯示名稱。
3. 每日活動固定輸出最近 14 天，缺少資料的日期補零。
4. view 使用 `security_invoker`，只會回傳目前使用者有權限的資料。
5. 最近練習列表可刪除單場紀錄；刪除後失效所有 query，統計改以剩餘場次累計。

## Query Key

| 模組 | Key |
| --- | --- |
| library | `['library', 'sets']`、`['library', 'set', setId]` |
| practice | `['practice', 'sessions']`、`['practice', 'session', sessionId]` |
| marks | `['marks']` |
| stats | `['stats', 'overview']`、`['stats', 'set', setId]` |
| settings | `['settings', 'preferences', userId]` |

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
3. `UpdatePrompt` 顯示「重新載入」與「稍後」。重新載入會呼叫 `updateSW(true)`，期間顯示更新進度並停用操作；完成後自動重新載入，失敗時顯示錯誤並允許重試。
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
- 匯出與更新：驗證匯出檔可回匯、題號差異分類、作答正確性重算與移除題目後的資料清理。
- 題目瀏覽：驗證每批 20 題、載入更多、題幹／選項／解析／題號搜尋、主題篩選與展開內容。
- 複製題目：驗證複製文字包含題號、主題、題幹與選項，並處理剪貼簿失敗與提示重設。
- 帳號偏好：驗證格式錯誤回落預設、設定頁開關的樂觀更新與失敗回滾，以及答錯自動標記只在設定開啟、答錯且尚未標記時觸發。
- 主題：驗證預設跟隨系統、無效儲存值回落、淺色與深色的套用結果、系統偏好變更時的通知，以及重設後的清理。
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
