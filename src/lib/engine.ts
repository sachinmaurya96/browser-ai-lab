/// <reference lib="webworker" />
/**
 * Worker-side runtime. A tool's worker describes its model as an `Engine`
 * (how to boot it, which operations it exposes) and calls `serve(engine)`.
 * This module handles the message loop, lazy single boot, run queueing,
 * download-progress forwarding and error reporting.
 */
import type { Device, FromWorker, GpuInfo, ToWorker } from './protocol'

export interface Progress {
  (info: unknown): void
}

export interface RunContext {
  /** Push an intermediate value (streamed token, batch progress…) to the UI. */
  emit(data: unknown): void
  /** Buffers to transfer (zero-copy) with the final result. */
  transfer: Transferable[]
}

export interface Engine<M> {
  boot(env: { gpu: GpuInfo; progress: Progress; config: never }): Promise<{ model: M; device: Device }>
  ops: Record<string, (model: M, input: never, ctx: RunContext) => Promise<unknown>>
  /** Ask an in-flight generation to wrap up early. */
  stop?(): void
}

const post = (msg: FromWorker, transfer: Transferable[] = []) =>
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(msg, transfer)

export async function probeGpu(): Promise<GpuInfo> {
  try {
    const adapter = await navigator.gpu?.requestAdapter()
    if (!adapter) return { webgpu: false, f16: false }
    return { webgpu: true, f16: adapter.features.has('shader-f16') }
  } catch {
    return { webgpu: false, f16: false }
  }
}

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e))

export function serve<M>(engine: Engine<M>): void {
  let booted: Promise<{ model: M; device: Device }> | null = null
  let queue: Promise<unknown> = Promise.resolve()
  let config: unknown = undefined

  const progress: Progress = (info) => {
    const p = info as { status?: string; file?: string; loaded?: number; total?: number }
    if (p.status === 'progress' && p.file && p.total) {
      post({ kind: 'fetch', file: p.file, loaded: p.loaded ?? 0, total: p.total })
    }
  }

  const ensureBooted = () => {
    if (!booted) {
      post({ kind: 'booting' })
      booted = probeGpu()
        .then((gpu) => engine.boot({ gpu, progress, config: config as never }))
        .then((r) => {
          post({ kind: 'ready', device: r.device })
          return r
        })
      // A failed boot can be retried from scratch.
      booted.catch(() => (booted = null))
    }
    return booted
  }

  self.addEventListener('message', (event: MessageEvent<ToWorker>) => {
    const msg = event.data
    switch (msg.kind) {
      case 'probe':
        void probeGpu().then((gpu) => post({ kind: 'probe', gpu }))
        break
      case 'configure':
        config = msg.config
        break
      case 'boot':
        ensureBooted().catch((e) => post({ kind: 'fail', id: null, message: errorText(e) }))
        break
      case 'stop':
        engine.stop?.()
        break
      case 'run': {
        const op = engine.ops[msg.op]
        queue = queue.then(async () => {
          try {
            if (!op) throw new Error(`Unknown operation "${msg.op}"`)
            const { model } = await ensureBooted()
            post({ kind: 'started', id: msg.id })
            const ctx: RunContext = {
              emit: (data) => post({ kind: 'emit', id: msg.id, data }),
              transfer: [],
            }
            const value = await op(model, msg.input as never, ctx)
            post({ kind: 'done', id: msg.id, value }, ctx.transfer)
          } catch (e) {
            post({ kind: 'fail', id: msg.id, message: errorText(e) })
          }
        })
        break
      }
    }
  })
}
