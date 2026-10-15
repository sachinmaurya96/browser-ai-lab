import { useEffect, useRef, useState } from 'react'
import { Camera, CameraOff, ImageUp, Pause, Play, Radio, Send, Square, SwitchCamera, Trash2 } from 'lucide-react'
import { useModel } from '../../lib/useModel'
import { prepareImage, validateImage } from '../../lib/images'
import { ModelCard } from '../../ui/ModelCard'
import { ToolIntro } from '../../ui/Shell'
import { Button, Chip, Kicker, Notice, Panel, Tag, cx, inputClass } from '../../ui/kit'
import { useWebcam } from './useWebcam'
import type { AskInput, StreamEvent } from './worker'

interface Frame {
  id: number
  url: string
  source: 'camera' | 'upload'
}

interface Turn {
  id: number
  frameId: number
  question: string
  answer: string
  status: 'waiting' | 'streaming' | 'done' | 'stopped' | 'error'
  tps: number | null
}

const QUICK = ['What is in this picture?', 'How many people are visible?', 'What colour is the main object?', 'Is there any text? What does it say?', 'Describe the setting.']
const NARRATE_EVERY_MS = 2500

export default function LookPage() {
  const model = useModel(() => new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }))
  const cam = useWebcam()
  const [frame, setFrame] = useState<Frame | null>(null)
  const [turns, setTurns] = useState<Turn[]>([])
  const [question, setQuestion] = useState('')
  const [narrate, setNarrate] = useState(false)
  const [narration, setNarration] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const nextId = useRef(1)
  const asking = turns.some((t) => t.status === 'waiting' || t.status === 'streaming')
  const askingRef = useRef(false)
  askingRef.current = asking
  const fileRef = useRef<HTMLInputElement>(null)
  const stopRequested = useRef(false)
  const threadEnd = useRef<HTMLDivElement>(null)

  useEffect(() => {
    threadEnd.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [turns])

  // Live narration: caption the live feed, waiting for each caption to finish
  // before scheduling the next so requests never pile up in the worker.
  useEffect(() => {
    if (!narrate || cam.state !== 'live' || frame) {
      setNarration(null)
      return
    }
    let alive = true
    let timer: ReturnType<typeof setTimeout>
    const tick = async () => {
      if (!alive) return
      const shot = askingRef.current ? null : cam.snapshot(448)
      if (shot) {
        try {
          const text = await model.run<string>('ask', { image: shot, question: 'In one short sentence, what is happening in this image?', maxTokens: 40 } satisfies AskInput)
          if (alive) setNarration(text)
        } catch {
          /* skip a failed tick */
        }
      }
      if (alive) timer = setTimeout(() => void tick(), NARRATE_EVERY_MS)
    }
    void tick()
    return () => {
      alive = false
      clearTimeout(timer)
    }
    // model.run and cam.snapshot are stable callbacks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [narrate, cam.state, frame])

  const freeze = () => {
    const url = cam.snapshot()
    if (!url) return null
    const f: Frame = { id: nextId.current++, url, source: 'camera' }
    setFrame(f)
    return f
  }

  const resume = () => setFrame(null)

  const ask = async (q: string) => {
    const text = q.trim()
    if (!text || asking) return
    const f = frame ?? (cam.state === 'live' ? freeze() : null)
    if (!f) return
    const id = nextId.current++
    setQuestion('')
    setTurns((ts) => [...ts, { id, frameId: f.id, question: text, answer: '', status: 'waiting', tps: null }])
    const update = (p: Partial<Turn>) => setTurns((ts) => ts.map((t) => (t.id === id ? { ...t, ...p } : t)))
    stopRequested.current = false
    try {
      const answer = await model.run<string>('ask', { image: f.url, question: text, maxTokens: 256 } satisfies AskInput, (d) => {
        const e = d as StreamEvent
        setTurns((ts) => ts.map((t) => (t.id === id ? { ...t, status: 'streaming', answer: t.answer + e.text, tps: e.tps ?? t.tps } : t)))
      })
      update({ answer, status: stopRequested.current ? 'stopped' : 'done' })
    } catch (e) {
      update({ answer: (e as Error).message, status: 'error' })
    }
  }

  const stopAnswer = () => {
    stopRequested.current = true
    setTurns((ts) => ts.map((t) => (t.status === 'waiting' || t.status === 'streaming' ? { ...t, status: 'stopped' } : t)))
    model.stop()
  }

  const onUpload = async (file: File | undefined) => {
    if (!file) return
    const problem = validateImage(file)
    setUploadError(problem)
    if (problem) return
    const img = await prepareImage(file, 1024)
    // Convert to a data URL so the worker can read it regardless of origin.
    const blob = await fetch(img.url).then((r) => r.blob())
    URL.revokeObjectURL(img.url)
    const url = await new Promise<string>((res) => {
      const reader = new FileReader()
      reader.onload = () => res(reader.result as string)
      reader.readAsDataURL(blob)
    })
    setFrame({ id: nextId.current++, url, source: 'upload' })
  }

  const live = cam.state === 'live'
  const canAsk = !!frame || live
  const frameTurns = (id: number) => turns.filter((t) => t.frameId === id)

  return (
    <div className="space-y-6">
      <ToolIntro slug="look" />
      <ModelCard
        model={model}
        info={{ name: 'onnx-community/LFM2.5-VL-450M-ONNX', href: 'https://huggingface.co/onnx-community/LFM2.5-VL-450M-ONNX', size: '~450–900 MB', task: 'visual question answering' }}
        autoNote="Loads automatically on your first question. "
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <Panel
          kicker={frame ? (frame.source === 'upload' ? 'Uploaded photo' : `Frozen frame #${frame.id}`) : live ? 'Live' : 'Camera'}
          title={frame ? 'Asking about this still' : live ? 'Point at something, then freeze' : 'Start your camera or upload a photo'}
          actions={
            <>
              {live && !frame && (
                <Button size="sm" tone="ghost" onClick={() => void cam.start(cam.facing === 'user' ? 'environment' : 'user')} aria-label="Switch camera">
                  <SwitchCamera size={15} />
                </Button>
              )}
              {live && (
                <Button size="sm" tone="ghost" onClick={() => { cam.stop(); setNarrate(false) }}>
                  <CameraOff size={15} /> Off
                </Button>
              )}
            </>
          }
        >
          <div className="relative aspect-video overflow-hidden rounded-lg bg-ink">
            <video ref={cam.videoRef} muted playsInline className={cx('size-full object-cover', cam.facing === 'user' && '-scale-x-100', (!live || frame) && 'invisible')} />
            {frame && <img src={frame.url} alt="Frame being asked about" className="absolute inset-0 size-full object-contain" />}

            {!live && !frame && (
              <div className="absolute inset-0 grid place-items-center p-6 text-center text-paper">
                <div className="space-y-4">
                  <Camera size={36} className="mx-auto opacity-60" />
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button tone="primary" className="!bg-paper !text-ink" onClick={() => void cam.start()} disabled={cam.state === 'starting'}>
                      <Camera size={16} /> {cam.state === 'starting' ? 'Starting…' : 'Start camera'}
                    </Button>
                    <Button tone="outline" className="!border-paper/60 !text-paper hover:!bg-paper hover:!text-ink" onClick={() => fileRef.current?.click()}>
                      <ImageUp size={16} /> Upload photo
                    </Button>
                  </div>
                  <p className="font-mono text-[11px] text-paper/50">Frames stay in this tab. Nothing is recorded or sent.</p>
                </div>
              </div>
            )}

            {live && !frame && (
              <span className="absolute top-3 left-3 flex items-center gap-1.5 rounded bg-accent px-2 py-0.5 font-mono text-[11px] uppercase text-accent-ink">
                <span className="size-1.5 animate-pulse rounded-full bg-current" /> live
              </span>
            )}
            {narration && live && !frame && (
              <p className="absolute inset-x-3 bottom-3 rounded-md bg-ink/80 px-3 py-2 text-sm text-paper backdrop-blur">{narration}</p>
            )}
          </div>

          {(cam.message || uploadError) && (
            <div className="mt-4">
              <Notice tone="error">{cam.message ?? uploadError}</Notice>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {live && !frame && (
              <Button tone="primary" onClick={freeze}>
                <Pause size={16} /> Freeze frame
              </Button>
            )}
            {frame && (
              <Button tone="outline" onClick={resume}>
                <Play size={16} /> {live ? 'Back to live' : 'Clear photo'}
              </Button>
            )}
            {(live || frame) && (
              <Button tone="ghost" onClick={() => fileRef.current?.click()}>
                <ImageUp size={16} /> Upload
              </Button>
            )}
            {live && (
              <label className={cx('ml-auto flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm', narrate ? 'border-accent text-accent' : 'border-rule text-ink-2')}>
                <input type="checkbox" className="sr-only" checked={narrate} onChange={(e) => setNarrate(e.target.checked)} />
                <Radio size={15} /> Live narration {narrate ? 'on' : 'off'}
              </label>
            )}
          </div>
          {narrate && live && <p className="mt-2 text-xs text-ink-3">Narration pauses while a frame is frozen or a question is being answered.</p>}
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" tabIndex={-1} onChange={(e) => { void onUpload(e.target.files?.[0]); e.target.value = '' }} />
        </Panel>

        <Panel
          kicker="Conversation"
          title="Questions & answers"
          actions={
            turns.length > 0 && (
              <Button size="sm" tone="ghost" disabled={asking} onClick={() => setTurns([])}>
                <Trash2 size={15} /> Clear
              </Button>
            )
          }
        >
          <div className="flex h-[480px] flex-col">
            <div className="-mx-1 flex-1 space-y-4 overflow-y-auto px-1">
              {turns.length === 0 && (
                <div className="paper-grid grid h-full place-items-center rounded-lg border border-dashed border-rule p-6 text-center text-sm text-ink-3">
                  Ask anything about the frame. If the camera is live, asking freezes the current frame automatically.
                </div>
              )}
              {turns.map((t, i) => {
                const firstForFrame = i === 0 || turns[i - 1].frameId !== t.frameId
                return (
                  <div key={t.id} className="space-y-2">
                    {firstForFrame && (
                      <Kicker className="pt-2">
                        Frame #{t.frameId} · {frameTurns(t.frameId).length} question{frameTurns(t.frameId).length > 1 ? 's' : ''}
                      </Kicker>
                    )}
                    <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-ink px-3 py-2 text-sm text-paper">{t.question}</p>
                    <div className={cx('w-fit max-w-[92%] rounded-2xl rounded-bl-sm border px-3 py-2 text-sm', t.status === 'error' ? 'border-danger/50 text-danger' : 'border-rule bg-paper')}>
                      {t.status === 'waiting' ? (
                        <span className="font-mono text-xs text-ink-3">{model.phase === 'downloading' ? 'loading model…' : 'looking…'}</span>
                      ) : (
                        <span className={cx('whitespace-pre-wrap', t.status === 'streaming' && 'caret')}>{t.answer}</span>
                      )}
                      {(t.status === 'done' || t.status === 'stopped') && (
                        <span className="mt-1 flex gap-2">
                          {t.status === 'stopped' && <Tag tone="sun">stopped</Tag>}
                          {t.tps && <Tag>{t.tps.toFixed(1)} tok/s</Tag>}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
              <div ref={threadEnd} />
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {QUICK.map((q) => (
                <Chip key={q} disabled={!canAsk || asking} onClick={() => void ask(q)}>
                  {q}
                </Chip>
              ))}
            </div>
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                void ask(question)
              }}
            >
              <input aria-label="Your question" className={inputClass} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder={canAsk ? 'Ask about the frame…' : 'Start the camera or upload a photo first'} disabled={!canAsk} />
              {asking ? (
                <Button tone="danger" onClick={stopAnswer} aria-label="Stop answer">
                  <Square size={15} />
                </Button>
              ) : (
                <Button tone="primary" type="submit" disabled={!canAsk || !question.trim()} aria-label="Ask">
                  <Send size={15} />
                </Button>
              )}
            </form>
          </div>
        </Panel>
      </div>

      <Notice tone="info">
        A 450M-parameter model is fast but fallible. It can miscount, misread small text, or confidently describe
        things that aren't there. Treat answers as a quick look, not a verdict.
      </Notice>
    </div>
  )
}
