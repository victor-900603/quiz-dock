export type UpdateServiceWorker = (reloadPage?: boolean) => Promise<void>

export type PwaState = {
  needRefresh: boolean
  updateSW: UpdateServiceWorker | null
}

const initialState: PwaState = {
  needRefresh: false,
  updateSW: null,
}

let state = initialState
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((listener) => listener())
}

export function subscribePwa(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getPwaState(): PwaState {
  return state
}

export function setNeedRefresh(updateSW: UpdateServiceWorker): void {
  state = { needRefresh: true, updateSW }
  notify()
}

export function dismissUpdate(): void {
  state = { ...state, needRefresh: false }
  notify()
}

export function resetPwaStore(): void {
  state = initialState
  notify()
}
