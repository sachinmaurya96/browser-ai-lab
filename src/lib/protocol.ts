/**
 * Message protocol shared by every model worker and the `useModel` hook.
 *
 * One worker hosts one model. The UI asks it to `boot` (download + init) and
 * then to `run` named operations. Runs are queued inside the worker, so the UI
 * never has to guard against overlapping requests.
 */

export type Device = 'webgpu' | 'wasm'

export interface GpuInfo {
  webgpu: boolean
  /** Adapter supports `shader-f16` (half-precision weights). */
  f16: boolean
}

export type ToWorker =
  | { kind: 'probe' }
  | { kind: 'configure'; config: unknown }
  | { kind: 'boot' }
  | { kind: 'run'; id: number; op: string; input: unknown }
  | { kind: 'stop' }

export type FromWorker =
  | { kind: 'probe'; gpu: GpuInfo }
  | { kind: 'booting' }
  | { kind: 'fetch'; file: string; loaded: number; total: number }
  | { kind: 'ready'; device: Device }
  | { kind: 'started'; id: number }
  | { kind: 'emit'; id: number; data: unknown }
  | { kind: 'done'; id: number; value: unknown }
  | { kind: 'fail'; id: number | null; message: string }
