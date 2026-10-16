import { useCallback, useEffect, useState } from 'react'
import { useModel } from './useModel'
import type { PipelineCall, PipelineConfig } from './pipeline.worker'
import type { ChatInput, LlmCandidate, LlmConfig, LlmToken } from './llm.worker'

/** A model hosted by the shared pipeline worker. */
export function usePipeline(config: PipelineConfig) {
  const model = useModel(() => new Worker(new URL('./pipeline.worker.ts', import.meta.url), { type: 'module' }), config)
  const call = useCallback(
    <T,>(...args: unknown[]) => model.run<T>('run', { args } satisfies PipelineCall),
    [model.run],
  )
  const callWith = useCallback(
    <T,>(args: unknown[], options: Record<string, unknown>) => model.run<T>('run', { args, options } satisfies PipelineCall),
    [model.run],
  )
  return { model, call, callWith }
}

/**
 * General-purpose assistant: Llama 3.2 1B in q4f16 is the build Transformers.js
 * uses in its WebGPU demos (stable in half precision, ~1.2 GB). Qwen 0.5B in
 * plain q4 is the low-memory fallback. Every option is self-tested on load.
 */
export const ASSISTANT: LlmCandidate[] = [
  { model: 'onnx-community/Llama-3.2-1B-Instruct-q4f16', dtype: 'q4f16', device: 'webgpu' },
  { model: 'onnx-community/Qwen2.5-0.5B-Instruct', dtype: 'q4', device: 'webgpu' },
  { model: 'onnx-community/Qwen2.5-0.5B-Instruct', dtype: 'q4', device: 'wasm' },
]

/** A chat model hosted by the shared LLM worker, with streaming state. */
export function useLlm(candidates: string | LlmCandidate[]) {
  const list: LlmCandidate[] = typeof candidates === 'string'
    ? [{ model: candidates, dtype: 'q4', device: 'webgpu' }, { model: candidates, dtype: 'q4', device: 'wasm' }]
    : candidates
  const primary = list[0].model
  const model = useModel(() => new Worker(new URL('./llm.worker.ts', import.meta.url), { type: 'module' }), { candidates: list } satisfies LlmConfig)
  const [loaded, setLoaded] = useState<string | null>(null)
  useEffect(() => {
    if (model.phase === 'ready') void model.run<string>('info', null).then(setLoaded).catch(() => undefined)
  }, [model.phase, model.run])
  const [streaming, setStreaming] = useState(false)
  const [tps, setTps] = useState<number | null>(null)

  const chat = useCallback(
    async (input: ChatInput, onText: (full: string) => void) => {
      setStreaming(true)
      setTps(null)
      let full = ''
      try {
        return await model.run<string>('chat', input, (d) => {
          const e = d as LlmToken
          full += e.text
          onText(full)
          if (e.tps) setTps(e.tps)
        })
      } finally {
        setStreaming(false)
      }
    },
    [model.run],
  )
  /** Set when the device couldn't fit the requested model and used the fallback. */
  const downgraded = loaded && loaded !== primary ? loaded : null
  return { model, chat, streaming, tps, stop: model.stop, downgraded }
}

/** Small helper for "run async thing, track busy + error". */
export function useTask() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const go = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    setBusy(true)
    setError(null)
    try {
      return await fn()
    } catch (e) {
      setError((e as Error).message)
      return undefined
    } finally {
      setBusy(false)
    }
  }, [])
  return { busy, error, setError, go }
}
