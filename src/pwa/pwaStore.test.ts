import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  dismissUpdate,
  getPwaState,
  resetPwaStore,
  setNeedRefresh,
  subscribePwa,
} from './pwaStore'

describe('pwaStore', () => {
  beforeEach(() => {
    resetPwaStore()
  })

  it('stores the pending update and clears the prompt when dismissed', () => {
    const listener = vi.fn()
    const unsubscribe = subscribePwa(listener)
    const updateSW = vi.fn().mockResolvedValue(undefined)

    setNeedRefresh(updateSW)

    expect(getPwaState()).toEqual({ needRefresh: true, updateSW })
    expect(listener).toHaveBeenCalledTimes(1)

    dismissUpdate()

    expect(getPwaState()).toEqual({ needRefresh: false, updateSW })
    expect(listener).toHaveBeenCalledTimes(2)

    unsubscribe()
    dismissUpdate()
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('resets the state and notifies current subscribers', () => {
    const listener = vi.fn()
    subscribePwa(listener)
    setNeedRefresh(vi.fn().mockResolvedValue(undefined))

    resetPwaStore()

    expect(getPwaState()).toEqual({ needRefresh: false, updateSW: null })
    expect(listener).toHaveBeenCalledTimes(2)
  })
})
