import { useCallback, useState } from 'react'
import { useModel } from './useModel'
import type { PipelineCall, PipelineConfig } from './pipeline.worker'
import type { ChatInput, LlmConfig, LlmToken } from './llm.worker'

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

/** A chat model hosted by the shared LLM worker, with streaming state. */
export function useLlm(modelId: string) {
  const model = useModel(() => new Worker(new URL('./llm.worker.ts', import.meta.url), { type: 'module' }), { model: modelId } satisfies LlmConfig)
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
  return { model, chat, streaming, tps, stop: model.stop }
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
