import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { SyncPlan } from '../features/library/syncService'
import { SyncDialog } from './SyncDialog'

function plan(overrides: Partial<SyncPlan> = {}): SyncPlan {
  return {
    totalCount: 2,
    added: [],
    updated: [],
    reordered: [],
    removed: [],
    unchangedCount: 2,
    updatedAttemptCount: 0,
    removedAttemptCount: 0,
    removedMarkCount: 0,
    ...overrides,
  }
}

async function pasteJson(text: string) {
  await userEvent.click(screen.getByRole('tab', { name: '貼上內容' }))
  fireEvent.change(screen.getByLabelText('內容'), {
    target: { value: text },
  })
}

describe('SyncDialog', () => {
  it('previews the diff and confirms the update', async () => {
    const buildPlan = vi.fn().mockResolvedValue(
      plan({
        totalCount: 3,
        added: [{ questionNumber: 3, sortOrder: 2, question: '新題目' }],
        updated: [{ questionNumber: 1, sortOrder: 0, question: '舊題目' }],
        removed: [
          {
            id: 'question-2',
            questionNumber: 2,
            sortOrder: 1,
            question: '被移除的題目',
            attemptCount: 2,
            markCount: 1,
          },
        ],
        unchangedCount: 1,
        updatedAttemptCount: 2,
        removedAttemptCount: 2,
        removedMarkCount: 1,
      }),
    )
    const onSync = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()

    render(
      <SyncDialog
        open
        setTitle="生物學"
        onClose={onClose}
        buildPlan={buildPlan}
        onSync={onSync}
      />,
    )

    expect(screen.getByText('更新題庫')).toBeInTheDocument()

    const json = '{"title":"生物學","questions":[]}'
    await pasteJson(json)

    expect(await screen.findByText('有 1 題內容變動，會重新計算這些題目已作答紀錄的正確性（2 筆）。')).toBeInTheDocument()
    expect(screen.getByText('移除 1 題會一併刪除 2 筆作答與 1 個標記，無法復原。')).toBeInTheDocument()
    expect(screen.getByText('第 2 題：被移除的題目')).toBeInTheDocument()
    expect(buildPlan).toHaveBeenCalledWith({
      text: json,
      fileName: '',
      title: '生物學',
    })

    await userEvent.click(screen.getByRole('button', { name: '確認更新' }))

    await waitFor(() => {
      expect(onSync).toHaveBeenCalledWith({
        text: json,
        fileName: '',
        title: '生物學',
      })
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('disables the update when nothing changed', async () => {
    render(
      <SyncDialog
        open
        setTitle="生物學"
        onClose={vi.fn()}
        buildPlan={vi.fn().mockResolvedValue(plan())}
        onSync={vi.fn()}
      />,
    )

    await pasteJson('{"questions":[]}')

    expect(await screen.findByText('內容與目前的題庫相同，不需要更新。')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '確認更新' })).toBeDisabled()
  })

  it('shows an error when the diff cannot be built', async () => {
    render(
      <SyncDialog
        open
        setTitle="生物學"
        onClose={vi.fn()}
        buildPlan={vi.fn().mockRejectedValue(new Error('比對失敗'))}
        onSync={vi.fn()}
      />,
    )

    await pasteJson('{"questions":[]}')

    expect(await screen.findByRole('alert')).toHaveTextContent('比對失敗')
  })
})
