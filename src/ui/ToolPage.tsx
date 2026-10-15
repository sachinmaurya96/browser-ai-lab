import { useEffect, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import type { Model } from '../lib/useModel'
import { prepareImage, type PreparedImage } from '../lib/images'
import { ModelCard, type ModelInfo } from './ModelCard'
import { ToolIntro } from './Shell'
import { DropZone } from './DropZone'
import { Button, Notice } from './kit'

/** Standard tool layout: intro, model status, then the tool body. */
export function ToolPage({
  slug,
  model,
  info,
  error,
  children,
}: {
  slug: string
  model: Model
  info: ModelInfo
  error?: string | null
  children: ReactNode
}) {
  return (
    <div className="space-y-6">
      <ToolIntro slug={slug} />
      <ModelCard model={model} info={info} autoNote="Loads automatically the first time you run the tool. " />
      {error && <Notice tone="error">{error}</Notice>}
      {children}
    </div>
  )
}

/** Image state + picker. Revokes old object URLs automatically. */
export function useImage(maxSide = 1600) {
  const [image, setImage] = useState<PreparedImage | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => () => void (image && URL.revokeObjectURL(image.url)), [image])
  const pick = async (file: File) => {
    try {
      setError(null)
      const img = await prepareImage(file, maxSide)
      setImage(img)
      return img
    } catch (e) {
      setError((e as Error).message)
      return null
    }
  }
  return { image, pick, clear: () => setImage(null), error }
}

export function ImageInput({
  image,
  onFile,
  onClear,
  children,
}: {
  image: PreparedImage | null
  onFile: (f: File) => void
  onClear: () => void
  children?: ReactNode
}) {
  if (!image) return <DropZone onFile={onFile} />
  return (
    <div className="relative overflow-hidden rounded-lg border border-rule">
      {children ?? <img src={image.url} alt="Selected image" className="checker mx-auto max-h-[460px] object-contain" />}
      <Button size="sm" tone="primary" className="absolute top-2 right-2" onClick={onClear} aria-label="Remove image">
        <X size={15} />
      </Button>
    </div>
  )
}

export function Output({ text, placeholder, busy }: { text: string; placeholder: string; busy?: boolean }) {
  return (
    <div className="min-h-40 rounded-lg border border-rule bg-paper p-4 text-[15px] leading-relaxed whitespace-pre-wrap">
      {text ? <span className={busy ? 'caret' : undefined}>{text}</span> : <span className="text-ink-3">{busy ? 'Working…' : placeholder}</span>}
    </div>
  )
}
