import { useCallback, useEffect, useRef, useState } from 'react'
import type { Device, FromWorker, GpuInfo, ToWorker } from './protocol'

export type Phase = 'idle' | 'downloading' | 'ready' | 'error'

export interface ModelState {
  phase: Phase
  gpu: GpuInfo | null
  device: Device | null
  /** Bytes per file, merged into an overall percentage by `downloadRatio`. */
  files: Record<string, { loaded: number; total: number }>
  error: string | null
  /** Number of runs currently queued or executing. */
  pending: number
}

interface Waiter {
  resolve(value: unknown): void
  reject(err: Error): void
  onEmit?: (data: unknown) => void
}

export function downloadRatio(files: ModelState['files']): number | null {
  const list = Object.values(files)
  if (!list.length) return null
  const total = list.reduce((s, f) => s + f.total, 0)
  const loaded = list.reduce((s, f) => s + Math.min(f.loaded, f.total), 0)
  return total ? loaded / total : null
}

export function downloadBytes(files: ModelState['files']) {
  const list = Object.values(files)
  return {
    loaded: list.reduce((s, f) => s + Math.min(f.loaded, f.total), 0),
    total: list.reduce((s, f) => s + f.total, 0),
  }
}

/**
 * Owns one model worker for the lifetime of the component. `spawn` must create
 * the worker with a literal `new URL('./worker.ts', import.meta.url)` so Vite
 * can bundle it.
 */
export function useModel(spawn: () => Worker, config?: unknown) {
  const [state, setState] = useState<ModelState>({
    phase: 'idle',
    gpu: null,
    device: null,
    files: {},
    error: null,
    pending: 0,
  })
  const workerRef = useRef<Worker | null>(null)
  const waiters = useRef(new Map<number, Waiter>())
  const nextId = useRef(1)
  const spawnRef = useRef(spawn)
  const configRef = useRef(config)

  useEffect(() => {
    const worker = spawnRef.current()
    workerRef.current = worker
    const pending = waiters.current

    worker.onmessage = (event: MessageEvent<FromWorker>) => {
      const msg = event.data
      switch (msg.kind) {
        case 'probe':
          setState((s) => ({ ...s, gpu: msg.gpu }))
          break
        case 'booting':
          setState((s) => ({ ...s, phase: 'downloading', error: null }))
          break
        case 'fetch':
          setState((s) => ({
            ...s,
            files: { ...s.files, [msg.file]: { loaded: msg.loaded, total: msg.total } },
          }))
          break
        case 'ready':
          setState((s) => ({ ...s, phase: 'ready', device: msg.device }))
          break
        case 'started':
          break
        case 'emit':
          pending.get(msg.id)?.onEmit?.(msg.data)
          break
        case 'done':
          pending.get(msg.id)?.resolve(msg.value)
          pending.delete(msg.id)
          setState((s) => ({ ...s, pending: Math.max(0, s.pending - 1) }))
          break
        case 'fail':
          if (msg.id === null) {
            setState((s) => ({ ...s, phase: 'error', error: msg.message }))
          } else {
            pending.get(msg.id)?.reject(new Error(msg.message))
            pending.delete(msg.id)
            setState((s) => ({
              ...s,
              pending: Math.max(0, s.pending - 1),
              // A run that failed before the model came up means boot failed.
              ...(s.phase === 'downloading' ? { phase: 'error' as const, error: msg.message } : {}),
            }))
          }
          break
      }
    }

    if (configRef.current !== undefined) worker.postMessage({ kind: 'configure', config: configRef.current } satisfies ToWorker)
    worker.postMessage({ kind: 'probe' } satisfies ToWorker)

    return () => {
      worker.terminate()
      workerRef.current = null
      for (const w of pending.values()) w.reject(new Error('Worker closed'))
      pending.clear()
    }
  }, [])

  const boot = useCallback(() => {
    workerRef.current?.postMessage({ kind: 'boot' } satisfies ToWorker)
  }, [])

  const stop = useCallback(() => {
    workerRef.current?.postMessage({ kind: 'stop' } satisfies ToWorker)
  }, [])

  const run = useCallback(
    <T,>(op: string, input: unknown, onEmit?: (data: unknown) => void): Promise<T> => {
      const worker = workerRef.current
      if (!worker) return Promise.reject(new Error('Worker not ready'))
      const id = nextId.current++
      setState((s) => ({ ...s, pending: s.pending + 1 }))
      return new Promise<T>((resolve, reject) => {
        waiters.current.set(id, { resolve: resolve as (v: unknown) => void, reject, onEmit })
        worker.postMessage({ kind: 'run', id, op, input } satisfies ToWorker)
      })
    },
    [],
  )

  return { ...state, boot, run, stop }
}

export type Model = ReturnType<typeof useModel>
