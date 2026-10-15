import { useEffect, useRef, useState } from 'react'
import { Code2, RefreshCw, Wand2, X } from 'lucide-react'
import { useModel } from '../../lib/useModel'
import { prepareImage, type PreparedImage } from '../../lib/images'
import { ModelCard } from '../../ui/ModelCard'
import { DropZone } from '../../ui/DropZone'
import { ToolIntro } from '../../ui/Shell'
import { Button, CopyButton, Field, Notice, Panel, Segmented, Tag, cx, inputClass } from '../../ui/kit'
import { RECOMMENDED_MAX, htmlSnippet, length, polishCaption, withContext } from './polish'
import type { CaptionInput, Detail } from './worker'

const DETAILS: { value: Detail; label: string; hint: string }[] = [
  { value: 'short', label: 'Short', hint: 'One line — most inline images' },
  { value: 'medium', label: 'Medium', hint: 'A sentence or two' },
  { value: 'long', label: 'Long', hint: 'Rich description for complex images' },
]

export default function AltTextPage() {
  const model = useModel(() => new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }))
  const [image, setImage] = useState<PreparedImage | null>(null)
  const [detail, setDetail] = useState<Detail>('short')
  const [note, setNote] = useState('')
  const [decorative, setDecorative] = useState(false)
  const [drafts, setDrafts] = useState<Partial<Record<Detail, string>>>({})
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const token = useRef(0)

  useEffect(() => () => void (image && URL.revokeObjectURL(image.url)), [image])

  const generate = async (img: PreparedImage, level: Detail, force = false) => {
    const cached = drafts[level]
    if (cached && !force) {
      setText(withContext(cached, note))
      return
    }
    const t = ++token.current
    setBusy(true)
    setError(null)
    try {
      const raw = await model.run<string>('caption', { url: img.url, detail: level } satisfies CaptionInput)
      if (t !== token.current) return
      const clean = polishCaption(raw)
      setDrafts((d) => ({ ...d, [level]: clean }))
      setText(withContext(clean, note))
    } catch (e) {
      if (t === token.current) setError((e as Error).message)
    } finally {
      if (t === token.current) setBusy(false)
    }
  }

  const onFile = async (file: File) => {
    try {
      // Florence works at 768px; no need to keep more pixels than that around.
      const img = await prepareImage(file, 1024)
      setImage(img)
      setDrafts({})
      setText('')
      setDecorative(false)
      void generate(img, detail, true)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const onDetail = (d: Detail) => {
    setDetail(d)
    if (image) void generate(image, d)
  }

  const finalAlt = decorative ? '' : text
  const count = length(finalAlt)

  return (
    <div className="space-y-6">
      <ToolIntro slug="alt-text" />
      <ModelCard
        model={model}
        info={{ name: 'onnx-community/Florence-2-base-ft', href: 'https://huggingface.co/onnx-community/Florence-2-base-ft', size: '~350 MB', task: 'image captioning' }}
        autoNote="Loads automatically with your first image. "
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          kicker="01 · Image"
          title={image ? image.name : 'Choose an image'}
          actions={
            image && (
              <Button size="sm" tone="ghost" aria-label="Remove image" onClick={() => { token.current++; setImage(null); setText(''); setBusy(false) }}>
                <X size={16} />
              </Button>
            )
          }
        >
          {image ? (
            <div className="checker overflow-hidden rounded-lg border border-rule">
              <img src={image.url} alt={finalAlt || 'Image being described'} className="mx-auto max-h-[420px] object-contain" />
            </div>
          ) : (
            <DropZone onFile={onFile} />
          )}

          <div className="mt-5 space-y-4">
            <Field label="Detail level" htmlFor="detail">
              <div id="detail">
                <Segmented label="Detail level" value={detail} onChange={onDetail} options={DETAILS} disabled={busy} />
              </div>
            </Field>
            <Field label="Context note" htmlFor="note" hint="optional · appended">
              <input
                id="note"
                className={inputClass}
                placeholder="e.g. Our team at the 2026 offsite"
                value={note}
                onChange={(e) => {
                  setNote(e.target.value)
                  const base = drafts[detail]
                  if (base) setText(withContext(base, e.target.value))
                }}
              />
            </Field>
            <p className="text-xs text-ink-3">
              Florence-2 only follows fixed captioning tasks, so the note can't steer what it sees. It's added as an extra
              sentence you can edit.
            </p>
          </div>
        </Panel>

        <Panel
          kicker="02 · Alt text"
          title="Review & edit"
          actions={
            image && (
              <Button size="sm" tone="ghost" disabled={busy} onClick={() => void generate(image, detail, true)}>
                <RefreshCw size={15} /> Regenerate
              </Button>
            )
          }
        >
          <label className="mb-4 flex cursor-pointer items-start gap-3 rounded-lg border border-rule bg-paper p-3">
            <input type="checkbox" checked={decorative} onChange={(e) => setDecorative(e.target.checked)} className="mt-1 accent-[var(--accent)]" />
            <span className="text-sm">
              <span className="font-medium">Decorative image</span>
              <span className="block text-ink-3">Purely visual images should get an empty alt="" so screen readers skip them.</span>
            </span>
          </label>

          <div className="relative">
            <textarea
              aria-label="Alt text"
              rows={7}
              disabled={decorative}
              value={decorative ? '' : text}
              onChange={(e) => setText(e.target.value)}
              placeholder={busy ? '' : image ? 'Your alt text will appear here.' : 'Add an image to get a suggestion.'}
              className={cx(inputClass, 'resize-y leading-relaxed disabled:opacity-50')}
            />
            {busy && (
              <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-lg bg-paper/80 font-mono text-sm">
                <Wand2 size={16} className="animate-pulse text-accent" />
                {model.phase === 'downloading' ? 'Fetching model…' : 'Looking at the image…'}
              </div>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <span className={cx('font-mono text-xs', count > RECOMMENDED_MAX ? 'text-sun' : 'text-ink-3')}>
              {count} / {RECOMMENDED_MAX} chars {count > RECOMMENDED_MAX && '· consider trimming'}
            </span>
            <div className="flex gap-1">
              <CopyButton text={finalAlt} disabled={decorative} />
              <CopyButton text={htmlSnippet(finalAlt, image?.name ?? 'image.png')} label="HTML" disabled={!image} />
            </div>
          </div>

          {error && <div className="mt-4"><Notice tone="error">{error}</Notice></div>}

          {image && (
            <div className="mt-5 rounded-lg bg-ink p-3 font-mono text-xs text-paper">
              <span className="mb-1 flex items-center gap-1.5 text-paper/50"><Code2 size={13} /> snippet</span>
              <code className="break-all">{htmlSnippet(finalAlt, image.name)}</code>
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            {(Object.keys(drafts) as Detail[]).map((d) => (
              <Tag key={d} tone={d === detail ? 'accent' : 'plain'}>{d} cached</Tag>
            ))}
          </div>
          <Notice tone="warn">
            <strong>Always review.</strong> Captioning models can miss what matters in context, misread text, or guess
            wrong about people. You know why the image is on the page; the model doesn't.
          </Notice>
        </Panel>
      </div>
    </div>
  )
}
