import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ImportDialog } from './ImportDialog'
import { IMPORT_LIMITS } from '../schemas/import'

const validJson = JSON.stringify({
  title: '匯入題庫',
  description: '測試',
  questions: [
    {
      topic: '主題一',
      question: '題目一',
      options: { A: '甲', B: '乙' },
      correct_answers: ['A'],
    },
    {
      topic: '主題二',
      question: '題目二',
      options: { A: '丙', B: '丁' },
      correct_answers: ['A'],
    },
  ],
})

describe('ImportDialog', () => {
  it('shows validation errors and clears them when the input is emptied', async () => {
    const user = userEvent.setup()
    render(<ImportDialog open onClose={() => undefined} onImport={() => undefined} />)

    const dialog = screen.getByRole('dialog', { name: '匯入題庫' })
    await user.click(within(dialog).getByRole('tab', { name: '貼上內容' }))

    const textarea = within(dialog).getByLabelText('內容')
    fireEvent.change(textarea, { target: { value: '{oops' } })
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('無法解析 JSON')

    fireEvent.change(textarea, { target: { value: '   ' } })
    await waitFor(() =>
      expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument(),
    )
  })

  it('previews pasted JSON, edits the title, and imports', async () => {
    const user = userEvent.setup()
    const onImport = vi.fn()
    const onClose = vi.fn()
    render(<ImportDialog open onClose={onClose} onImport={onImport} />)

    const dialog = screen.getByRole('dialog', { name: '匯入題庫' })
    await user.click(within(dialog).getByRole('tab', { name: '貼上內容' }))
    fireEvent.change(within(dialog).getByLabelText('內容'), { target: { value: validJson } })

    expect(await within(dialog).findByLabelText('題庫標題')).toHaveValue('匯入題庫')
    fireEvent.change(within(dialog).getByLabelText('題庫標題'), { target: { value: '新標題' } })

    await user.click(within(dialog).getByRole('button', { name: '開始匯入' }))
    expect(onImport).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '新標題',
        fileName: '',
        text: validJson,
      }),
    )
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows import errors and prevents duplicate submission', async () => {
    const user = userEvent.setup()
    let rejectImport: (error: Error) => void = () => undefined
    const onImport = vi.fn(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectImport = reject
        }),
    )
    const onClose = vi.fn()
    render(<ImportDialog open onClose={onClose} onImport={onImport} />)

    const dialog = screen.getByRole('dialog', { name: '匯入題庫' })
    await user.click(within(dialog).getByRole('tab', { name: '貼上內容' }))
    fireEvent.change(within(dialog).getByLabelText('內容'), { target: { value: validJson } })
    await within(dialog).findByLabelText('題庫標題')

    await user.click(within(dialog).getByRole('button', { name: '開始匯入' }))

    expect(onImport).toHaveBeenCalledTimes(1)
    expect(within(dialog).getByRole('button', { name: '匯入中...' })).toBeDisabled()

    rejectImport(new Error('已匯入過相同題庫。'))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('已匯入過相同題庫。')
    expect(onClose).not.toHaveBeenCalled()
    expect(within(dialog).getByRole('button', { name: '開始匯入' })).toBeEnabled()
  })

  it('rejects files larger than 10 MB before reading them', async () => {
    const text = vi.fn(async () => validJson)
    render(<ImportDialog open onClose={() => undefined} onImport={() => undefined} />)

    const dialog = screen.getByRole('dialog', { name: '匯入題庫' })
    const file = {
      name: 'big.json',
      size: IMPORT_LIMITS.fileBytes + 1,
      text,
    } as unknown as File

    fireEvent.drop(within(dialog).getByRole('button', { name: /選擇題庫檔/ }), {
      dataTransfer: { files: [file] },
    })

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('檔案過大')
    expect(text).not.toHaveBeenCalled()
  })

  it('reads a dropped file and resets when cancelled', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<ImportDialog open onClose={onClose} onImport={() => undefined} />)

    const dialog = screen.getByRole('dialog', { name: '匯入題庫' })
    const file = {
      name: 'quiz.json',
      text: async () => validJson,
    } as File

    fireEvent.drop(within(dialog).getByRole('button', { name: /選擇題庫檔/ }), {
      dataTransfer: { files: [file] },
    })

    expect(await within(dialog).findByText('quiz.json')).toBeInTheDocument()
    expect(await within(dialog).findByLabelText('題庫標題')).toHaveValue('匯入題庫')

    await user.click(within(dialog).getByRole('button', { name: '取消' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('reads a selected file and ignores an empty selection', async () => {
    const user = userEvent.setup()
    render(<ImportDialog open onClose={() => undefined} onImport={() => undefined} />)

    const dialog = screen.getByRole('dialog', { name: '匯入題庫' })
    const input = dialog.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [] } })
    expect(within(dialog).queryByLabelText('題庫標題')).not.toBeInTheDocument()

    const file = {
      name: 'quiz.json',
      text: async () => validJson,
    } as File
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => expect(within(dialog).getByLabelText('題庫標題')).toHaveValue('匯入題庫'))
    await user.click(within(dialog).getByRole('button', { name: '開始匯入' }))
  })

  it('maps a pasted CSV table and imports the mapped questions', async () => {
    const user = userEvent.setup()
    const onImport = vi.fn()
    render(<ImportDialog open onClose={() => undefined} onImport={onImport} />)

    const dialog = screen.getByRole('dialog', { name: '匯入題庫' })
    await user.click(within(dialog).getByRole('tab', { name: '貼上內容' }))
    fireEvent.change(within(dialog).getByLabelText('內容'), {
      target: {
        value:
          '題幹,選項A,選項B,答案\n細胞的發電廠,細胞核,粒線體,B\nDNA 鹼基,腺嘌呤,胸腺嘧啶,A',
      },
    })

    expect(await within(dialog).findByText('欄位對應')).toBeInTheDocument()
    expect(await within(dialog).findByLabelText('題幹欄位')).toHaveValue('0')
    expect(within(dialog).getByLabelText('答案欄位')).toHaveValue('3')
    await within(dialog).findByLabelText('題庫標題')

    await user.click(within(dialog).getByRole('button', { name: '開始匯入' }))

    expect(onImport).toHaveBeenCalledTimes(1)
    const payload = onImport.mock.calls[0][0]
    const parsed = JSON.parse(payload.text)

    expect(parsed.questions).toHaveLength(2)
    expect(parsed.questions[0]).toMatchObject({
      question: '細胞的發電廠',
      correct_answers: 'B',
      options: [
        { key: 'A', text: '細胞核' },
        { key: 'B', text: '粒線體' },
      ],
    })
  })

  it('shows a mapping error when the required column is missing', async () => {
    const user = userEvent.setup()
    render(<ImportDialog open onClose={() => undefined} onImport={() => undefined} />)

    const dialog = screen.getByRole('dialog', { name: '匯入題庫' })
    await user.click(within(dialog).getByRole('tab', { name: '貼上內容' }))
    fireEvent.change(within(dialog).getByLabelText('內容'), {
      target: { value: '題幹,選項A,選項B,答案\n題目,甲,乙,A' },
    })

    const questionSelect = await within(dialog).findByLabelText('題幹欄位')
    await user.selectOptions(questionSelect, '')

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      '請選擇題幹與答案欄位。',
    )
    expect(
      within(dialog).getByRole('button', { name: '開始匯入' }),
    ).toBeDisabled()
  })

  it('opens a detailed help dialog from the question mark button', async () => {
    const user = userEvent.setup()
    render(<ImportDialog open onClose={() => undefined} onImport={() => undefined} />)

    const dialog = screen.getByRole('dialog', { name: '匯入題庫' })
    const helpButton = within(dialog).getByRole('button', { name: '匯入說明' })

    await user.click(helpButton)

    const help = await screen.findByRole('dialog', { name: '匯入說明' })
    expect(help).toHaveTextContent('檔案限制')
    expect(help).toHaveTextContent('JSON 基本結構')
    expect(help).toHaveTextContent('粒線體的主要功能是什麼？')
    expect(help).toHaveTextContent('CSV 與 TSV')
    expect(help).toHaveTextContent('題號,題幹,選項A')
    expect(help).toHaveTextContent('常見錯誤')
    expect(
      within(help).getByRole('link', { name: '查看完整格式說明' }),
    ).toHaveAttribute('href', expect.stringContaining('import-format.md'))

    await user.click(within(help).getAllByRole('button', { name: '關閉' })[0])
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: '匯入說明' }),
      ).not.toBeInTheDocument(),
    )
    expect(screen.getByRole('dialog', { name: '匯入題庫' })).toBeInTheDocument()

    await user.click(helpButton)
    await screen.findByRole('dialog', { name: '匯入說明' })
    await user.keyboard('{Escape}')
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: '匯入說明' }),
      ).not.toBeInTheDocument(),
    )
    expect(screen.getByRole('dialog', { name: '匯入題庫' })).toBeInTheDocument()
  })
})
