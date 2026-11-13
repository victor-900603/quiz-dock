# 資料庫設計

QuizDock 的資料層位於 Supabase PostgreSQL。所有使用者資料以 `auth.users.id` 為擁有者，透過 Row Level Security（RLS）隔離。前端只使用 anon public key，不接觸 `service_role`。

## 資料表

### `public.quiz_sets`

題庫主檔。

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `id` | `uuid` | 主鍵，預設 `gen_random_uuid()` |
| `owner_id` | `uuid` | 擁有者，參照 `auth.users(id)`，刪除使用者時連帶刪除 |
| `title` | `text` | 題庫標題，不可空白 |
| `description` | `text` | 題庫說明 |
| `topic_labels` | `jsonb` | 主題代碼對應顯示名稱 |
| `is_public` | `boolean` | 是否公開，預設 `false` |
| `source_filename` | `text` | 匯入來源檔名 |
| `source_hash` | `text` | 匯入內容雜湊，用於重複匯入檢查 |
| `created_at` / `updated_at` | `timestamptz` | 建立與更新時間，`updated_at` 由 trigger 維護 |

索引：`owner_id`、`(owner_id, source_hash)`。

### `public.questions`

題目明細，隸屬於題庫。

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `id` | `uuid` | 主鍵 |
| `set_id` | `uuid` | 所屬題庫，參照 `quiz_sets(id)` |
| `owner_id` | `uuid` | 擁有者，參照 `auth.users(id)` |
| `question_number` | `integer` | 原始題號 |
| `topic` | `text` | 主題代碼 |
| `question` | `text` | 題目內容，不可空白 |
| `options` | `jsonb` | 選項陣列，元素為 `{ key, text }` |
| `correct_answers` | `text[]` | 正確答案，至少一個 |
| `explanation` | `text` | 解析 |
| `content_hash` | `text` | 題目內容雜湊 |
| `sort_order` | `integer` | 排序 |
| `created_at` | `timestamptz` | 建立時間 |

唯一鍵：`(set_id, content_hash)`。索引：`(set_id, sort_order)`、`owner_id`。

### `public.practice_sessions`

每位使用者每個題庫僅保留一筆練習狀態。

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `id` | `uuid` | 主鍵 |
| `user_id` | `uuid` | 練習者，參照 `auth.users(id)` |
| `set_id` | `uuid` | 題庫，參照 `quiz_sets(id)` |
| `mode` | `text` | `sequential` 或 `random` |
| `status` | `text` | `in_progress`、`completed` 或 `abandoned` |
| `question_order` | `uuid[]` | 本次練習的題目順序 |
| `current_index` | `integer` | 目前題目索引 |
| `total_questions` | `integer` | 題目總數 |
| `answered_count` | `integer` | 已作答數 |
| `correct_count` | `integer` | 答對數 |
| `started_at` / `updated_at` / `completed_at` | `timestamptz` | 時間戳記 |

唯一鍵：`(user_id, set_id)`。索引：`(user_id, status, updated_at desc)`、`set_id`。

### `public.attempts`

每一題的作答紀錄，可修改答案。

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `id` | `uuid` | 主鍵 |
| `user_id` | `uuid` | 作答者，參照 `auth.users(id)` |
| `session_id` | `uuid` | 練習場次，參照 `practice_sessions(id)` |
| `set_id` | `uuid` | 題庫，參照 `quiz_sets(id)` |
| `question_id` | `uuid` | 題目，參照 `questions(id)` |
| `selected` | `text[]` | 使用者選擇 |
| `is_correct` | `boolean` | 是否答對 |
| `duration_ms` | `integer` | 作答時間，可為空 |
| `answered_at` / `updated_at` | `timestamptz` | 作答與更新時間 |

唯一鍵：`(session_id, question_id)`。索引：`(user_id, answered_at desc)`、`(user_id, set_id)`、`session_id`。

### `public.question_marks`

使用者標記的題目。

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `user_id` | `uuid` | 標記者，參照 `auth.users(id)` |
| `question_id` | `uuid` | 題目，參照 `questions(id)` |
| `created_at` | `timestamptz` | 標記時間 |

主鍵：`(user_id, question_id)`。索引：`(user_id, created_at desc)`。

## 關聯

```text
auth.users
  ├─ quiz_sets.owner_id
  ├─ questions.owner_id
  ├─ practice_sessions.user_id
  ├─ attempts.user_id
  └─ question_marks.user_id

quiz_sets
  ├─ questions.set_id
  ├─ practice_sessions.set_id
  └─ attempts.set_id

practice_sessions
  └─ attempts.session_id

questions
  ├─ attempts.question_id
  └─ question_marks.question_id
```

刪除題庫會連帶刪除題目、練習場次、作答紀錄與標記。刪除練習場次會連帶刪除該場次的作答紀錄。

## RLS 政策

所有資料表皆啟用 RLS。

| 資料表 | 讀取 | 寫入 |
| --- | --- | --- |
| `quiz_sets` | authenticated：自己的或公開的；anon：公開的 | 僅擁有者可新增、更新、刪除 |
| `questions` | authenticated：自己的或公開題庫內的；anon：公開題庫內的 | 僅擁有者可新增、更新、刪除，且題庫須為自己的 |
| `practice_sessions` | 僅自己的 | 僅自己的；新增時題庫須為自己的或公開的 |
| `attempts` | 僅自己的 | 僅自己的；新增時 session 須為自己的；可更新與刪除自己的紀錄 |
| `question_marks` | 僅自己的 | 僅自己的；新增時題目須為自己的或位於公開題庫 |

資料表 grants：

- `anon`：`select` `quiz_sets`、`questions`。
- `authenticated`：`quiz_sets`、`questions`、`practice_sessions`、`attempts`、`question_marks` 的 `select`、`insert`、`update`、`delete`，實際可用操作仍受 RLS 限制。
- 統計 view：`authenticated` 可 `select`。
- RPC：`authenticated` 可執行 `start_practice_session`、`submit_answer`。

## RPC

### `public.start_practice_session(p_set_id uuid, p_mode text, p_restart boolean)`

- `security invoker`，以呼叫者身分執行。
- 驗證使用者已登入、模式合法、題庫可見。
- 每位使用者每個題庫僅一筆 session；未重新開始時直接回傳現有 session。
- 重新開始時刪除該 session 的 attempts，重設題目順序與計數。
- 依 `sort_order` 或隨機順序建立 `question_order`。

### `public.submit_answer(p_session_id uuid, p_question_id uuid, p_selected text[], p_duration_ms integer)`

- `security invoker`，以呼叫者身分執行。
- 驗證 session 屬於使用者、題目屬於該題庫且位於本次練習順序中。
- 首次作答新增 attempt；再次作答更新 selected、is_correct 與 updated_at。
- 重新計算 answered_count、correct_count 與 session 狀態。
- 回傳是否正確、正確答案、解析、是否已作答、是否更新、session 狀態、目前索引與計數。

## 統計 View

所有 view 使用 `security_invoker = true`，繼承底層資料表的 RLS。

| View | 內容 |
| --- | --- |
| `v_set_stats` | 每位使用者每個題庫的作答數、答對數、正確率與最後作答時間 |
| `v_topic_stats` | 每位使用者每個題庫每個主題的作答數、答對數與正確率 |
| `v_daily_activity` | 每位使用者每日作答數與答對數，日期以 `Asia/Taipei` 時區計算 |
| `v_session_summary` | 練習場次摘要，包含模式、狀態、計數與正確率 |

## Migration 順序

```text
20261112051843_schema.sql                資料表、索引、updated_at trigger
20261112051847_rls.sql                   啟用 RLS、policies、grants
20261112051850_rpc.sql                   建立練習 RPC
20261112051853_views.sql                 建立統計 view
20261112155712_single_practice_state.sql 單一練習狀態、可修改答案
20261113031000_attempts_delete_policy.sql 允許刪除自己的 attempts
20261113032000_fix_start_practice_session.sql 修正重新開始流程
20261113033000_fix_submit_answer_ambiguous.sql 修正 RPC 欄位歧義
```

已套用的 migration 不直接修改；修正請新增 migration。

## RLS Smoke Test

`supabase/tests/rls.sql` 以固定 UUID 建立測試資料，整段包在 `begin;` 與 `rollback;` 之間，不會留下資料。測試涵蓋：

- 站長可讀取自己的私有與公開題庫。
- 站長可更新並刪除自己的 attempt。
- 測試帳號只看得到公開題庫與題目。
- 測試帳號看不到站長的 session、attempt、mark。
- 測試帳號不能新增題目到私有題庫、不能新增 attempt 到站長 session、不能標記私有題目。
- 測試帳號不能更新或刪除站長的 attempt。
- 測試帳號可以標記公開題目。
- anon 只能讀取公開題庫與題目。

執行方式與 UUID 替換步驟見 [`setup.md`](setup.md#7-rls-smoke-test)。
