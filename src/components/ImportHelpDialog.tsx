import type { ReactNode } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'

type ImportHelpDialogProps = {
  open: boolean
  onClose: () => void
}

const IMPORT_FORMAT_DOC_URL =
  'https://github.com/victor-900603/quiz-dock/blob/main/docs/import-format.md'

const LIMITS: Array<[string, string]> = [
  ['檔案大小', '10MB'],
  ['題數', '5000 題'],
  ['每題選項', '2 至 10 個'],
  ['題幹與解析', '各 20000 字元'],
]

const ALIASES: Array<[string, string]> = [
  ['題幹', 'question、stem、prompt、content、text'],
  ['選項', 'options、choices'],
  ['答案', 'correct_answers、correctAnswers、answer、correct'],
  ['解析', 'explanation、rationale、analysis'],
  ['題號', 'question_number、number、no'],
  ['主題', 'topic、subject、category'],
]

function Example({ title, code }: { title: string; code: string }) {
  return (
    <div className="mt-3">
      <p className="text-xs font-medium text-muted">{title}</p>
      <pre className="mt-1 overflow-x-auto rounded-lg border border-line bg-paper p-3 font-mono text-xs leading-6 text-ink">
        <code>{code}</code>
      </pre>
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section>
      <h3 className="font-serif text-lg text-ink">{title}</h3>
      <div className="mt-2 text-sm leading-6 text-muted">{children}</div>
    </section>
  )
}

export function ImportHelpDialog({ open, onClose }: ImportHelpDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="匯入說明"
      description="支援 JSON、CSV 與 TSV。以下範例可直接修改後使用。"
      className="max-w-3xl"
      footer={
        <Button variant="secondary" onClick={onClose}>
          關閉
        </Button>
      }
    >
      <div className="space-y-6">
        <Section title="檔案限制">
          <ul className="grid gap-1 sm:grid-cols-2">
            {LIMITS.map(([label, value]) => (
              <li key={label} className="flex justify-between gap-3 rounded-md bg-paper px-3 py-2">
                <span>{label}</span>
                <span className="font-mono text-ink">{value}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2">
            超過限制時會在匯入前直接顯示錯誤，不會寫入資料庫。
          </p>
        </Section>

        <Section title="JSON 基本結構">
          <p>
            外層可用 <code>questions</code>、<code>data</code>、<code>items</code> 或
            <code>list</code>，也可以包一層 <code>{'{ "quiz": { ... } }'}</code>。
            純陣列同樣支援。
          </p>
          <Example
            title="信封格式"
            code={`{
  "title": "生物學第一章",
  "description": "細胞構造與遺傳入門",
  "topic_labels": {
    "1": "細胞構造",
    "2": "遺傳學"
  },
  "questions": [
    {
      "question_number": 1,
      "topic": "1",
      "question": "粒線體的主要功能是什麼？",
      "options": {
        "A": "產生 ATP",
        "B": "儲存 DNA"
      },
      "correct_answers": ["A"],
      "explanation": "粒線體是細胞進行有氧呼吸的主要場所。"
    }
  ]
}`}
          />
          <p className="mt-3">欄位也接受常見別名，例如從其他工具匯出的資料：</p>
          <ul className="mt-2 space-y-1">
            {ALIASES.map(([label, value]) => (
              <li key={label}>
                <span className="text-ink">{label}</span>：{value}
              </li>
            ))}
          </ul>
          <Example
            title="使用別名"
            code={`{
  "name": "生物學第一章",
  "data": [
    {
      "stem": "粒線體的主要功能是什麼？",
      "choices": ["產生 ATP", "儲存 DNA"],
      "answer": "A",
      "rationale": "有氧呼吸的主要場所。",
      "subject": "細胞"
    }
  ]
}`}
          />
        </Section>

        <Section title="選項寫法">
          <p>選項可以用物件、帶鍵的陣列，或直接給字串陣列。</p>
          <Example
            title="自動配 A、B、C"
            code={`"options": ["產生 ATP", "儲存 DNA", "合成蛋白質"]`}
          />
          <p className="mt-3">也可以把正確答案標在選項上，省略 <code>correct_answers</code>：</p>
          <Example
            title="選項自帶正解"
            code={`"options": [
  { "text": "產生 ATP", "correct": true },
  { "text": "儲存 DNA", "correct": false }
]`}
          />
        </Section>

        <Section title="答案寫法">
          <p>以下寫法都能解析：</p>
          <Example
            title="選項鍵、多選與選項文字"
            code={`"correct_answers": "A"
"correct_answers": ["A", "C"]
"correct_answers": "A、C"
"correct_answers": "產生 ATP"`}
          />
          <p className="mt-3">
            數字會先比對同名選項鍵；找不到才視為第幾個選項（從 1 開始）。
          </p>
          <Example
            title="數字答案"
            code={`// 選項鍵為 "1"、"2" 時，2 代表鍵 "2"
"options": { "1": "甲", "2": "乙" },
"correct_answers": 2

// 選項鍵為 A、B 時，2 代表第二個選項 B
"options": { "A": "甲", "B": "乙" },
"correct_answers": 2`}
          />
          <p className="mt-3">也可以用布林對應表標示正解：</p>
          <Example
            title="布林對應"
            code={`"correct_answers": { "A": true, "B": false, "C": true }`}
          />
        </Section>

        <Section title="CSV 與 TSV">
          <p>
            第一列通常是標題。匯入時會自動猜測欄位，也可以在「欄位對應」手動調整：
            題幹與答案為必選，選項欄位可勾選多個，依勾選順序配 A、B、C。
          </p>
          <Example
            title="含標題的 CSV"
            code={`題號,題幹,選項A,選項B,選項C,答案,解析,主題
1,粒線體的主要功能是什麼？,產生 ATP,儲存 DNA,合成蛋白質,A,有氧呼吸的主要場所,細胞
2,DNA 的腺嘌呤會與哪個鹼基配對？,胸腺嘧啶,鳥嘌呤,胞嘧啶,A,,遺傳`}
          />
          <p className="mt-3">
            檔案以 UTF-8 優先；不是有效 UTF-8 時會嘗試 Big5。仍無法辨識時請另存為 UTF-8。
          </p>
        </Section>

        <Section title="更新題庫">
          <p>
            更新時以 <code>question_number</code> 辨識題目。題號相同且內容未變會保留作答進度；
            內容變更會重新計算該題既有作答的正確性；新題號附加在最後；
            未出現的題號會刪除，並連帶刪除相關作答與標記。
          </p>
          <p className="mt-2">
            因此不要任意重新編號。題庫標題不會因更新而改變，重新命名請使用「重新命名」。
          </p>
        </Section>

        <Section title="常見錯誤">
          <ul className="list-disc space-y-1 pl-5">
            <li>答案不在選項中：確認答案使用選項鍵或完全相同的選項文字。</li>
            <li>同題號出現不同內容：更新檔案中的題號必須唯一。</li>
            <li>不同題號出現相同內容：請移除重複題目，或調整題號。</li>
            <li>選項少於 2 個：每題至少需要兩個選項。</li>
          </ul>
          <p className="mt-2">驗證錯誤會一次列出，畫面最多顯示 20 筆。</p>
        </Section>

        <p>
          <a
            href={IMPORT_FORMAT_DOC_URL}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-accent underline-offset-4 hover:underline"
          >
            查看完整格式說明
          </a>
        </p>
      </div>
    </Modal>
  )
}
