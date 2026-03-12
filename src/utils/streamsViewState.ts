import { STORAGE_KEYS } from '@/constants/storageKeys'
import type { StreamDetailsTab } from '@/composables/useStreamHistory'

type StreamsViewState = {
  selectedStreamId?: string
  tab?: StreamDetailsTab
  listScrollTop?: number
}

function hasStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function readStreamsViewState(): StreamsViewState | null {
  if (!hasStorage()) return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.STREAMS_VIEW_STATE)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StreamsViewState
    if (!parsed || typeof parsed !== 'object') return null
    if (parsed.tab && !isStreamDetailsTab(parsed.tab)) {
      delete parsed.tab
    }
    if (parsed.listScrollTop != null) {
      const normalizedScrollTop = Number(parsed.listScrollTop)
      if (!Number.isFinite(normalizedScrollTop) || normalizedScrollTop < 0) {
        delete parsed.listScrollTop
      } else {
        parsed.listScrollTop = Math.floor(normalizedScrollTop)
      }
    }
    return parsed
  } catch {
    return null
  }
}

function writeStreamsViewState(state: StreamsViewState): void {
  if (!hasStorage()) return
  try {
    window.localStorage.setItem(STORAGE_KEYS.STREAMS_VIEW_STATE, JSON.stringify(state))
  } catch {
    // ignore storage errors (quota, privacy mode, etc.)
  }
}

export function updateStreamsViewState(patch: StreamsViewState): void {
  const existing = readStreamsViewState() || {}
  writeStreamsViewState({
    ...existing,
    ...patch
  })
}

export function setSelectedStreamInViewState(streamId?: string): void {
  updateStreamsViewState({
    selectedStreamId: streamId || undefined
  })
}

export function setStreamsListScrollInViewState(scrollTop?: number): void {
  updateStreamsViewState({
    listScrollTop:
      typeof scrollTop === 'number' && Number.isFinite(scrollTop) && scrollTop >= 0
        ? Math.floor(scrollTop)
        : undefined
  })
}

function isStreamDetailsTab(value: unknown): value is StreamDetailsTab {
  return (
    value === 'configuration' || value === 'monitor' || value === 'history' || value === 'compare'
  )
}
