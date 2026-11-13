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
    await user.click(within(dialog).getByRole('tab', { name: '貼上 JSON' }))

    const textarea = within(dialog).getByLabelText('JSON 內容')
    fireEvent.change(textarea, { target: { value: '{oops' } })
    expect(within(dialog).getByRole('alert')).toHaveTextContent('無法解析 JSON')

    fireEvent.change(textarea, { target: { value: '   ' } })
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument()
  })

  it('previews pasted JSON, edits the title, and imports', async () => {
    const user = userEvent.setup()
    const onImport = vi.fn()
    const onClose = vi.fn()
    render(<ImportDialog open onClose={onClose} onImport={onImport} />)

    const dialog = screen.getByRole('dialog', { name: '匯入題庫' })
    await user.click(within(dialog).getByRole('tab', { name: '貼上 JSON' }))
    fireEvent.change(within(dialog).getByLabelText('JSON 內容'), { target: { value: validJson } })

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
    await user.click(within(dialog).getByRole('tab', { name: '貼上 JSON' }))
    fireEvent.change(within(dialog).getByLabelText('JSON 內容'), { target: { value: validJson } })

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

    fireEvent.drop(within(dialog).getByRole('button', { name: /選擇 JSON 檔/ }), {
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

    fireEvent.drop(within(dialog).getByRole('button', { name: /選擇 JSON 檔/ }), {
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
})
