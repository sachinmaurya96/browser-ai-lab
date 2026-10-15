import { useState } from 'react'
import { ScanLine } from 'lucide-react'
import { useModel } from '../../lib/useModel'
import { useTask } from '../../lib/hooks'
import { saveBlob, stem } from '../../lib/images'
import { ImageInput, ToolPage, useImage } from '../../ui/ToolPage'
import { Button, CopyButton, Panel } from '../../ui/kit'
import type { CaptionInput } from '../alt-text/worker'

export default function OcrPage() {
  // Shares Florence-2 (and its browser cache) with the alt-text tool.
  const model = useModel(() => new Worker(new URL('../alt-text/worker.ts', import.meta.url), { type: 'module' }))
  const img = useImage(1600)
  const task = useTask()
  const [text, setText] = useState('')

  const scan = (url: string) =>
    task.go(async () => {
      setText('')
      const raw = await model.run<string>('caption', { url, detail: 'ocr' } satisfies CaptionInput)
      setText(raw.replace(/<\/?s>|<pad>/g, '').trim() || '(No readable text found.)')
    })

  return (
    <ToolPage slug="ocr" model={model} error={task.error ?? img.error} info={{ name: 'onnx-community/Florence-2-base-ft', href: 'https://huggingface.co/onnx-community/Florence-2-base-ft', size: '~350 MB', task: 'OCR' }}>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel kicker="Image" title="Screenshot, receipt, sign or document">
          <ImageInput image={img.image} onClear={img.clear} onFile={async (f) => { const i = await img.pick(f); if (i) void scan(i.url) }} />
          {img.image && (
            <Button className="mt-4" tone="primary" disabled={task.busy} onClick={() => void scan(img.image!.url)}>
              <ScanLine size={16} /> {task.busy ? 'Reading…' : 'Scan again'}
            </Button>
          )}
        </Panel>
        <Panel kicker="Text" title="Extracted text" actions={<><CopyButton text={text} /><Button size="sm" tone="ghost" disabled={!text} onClick={() => saveBlob(new Blob([text]), `${stem(img.image?.name ?? 'scan')}.txt`)}>.txt</Button></>}>
          <textarea aria-label="Extracted text" value={text} onChange={(e) => setText(e.target.value)} rows={14} placeholder={task.busy ? 'Reading text…' : 'Text found in the image appears here.'} className="w-full rounded-lg border border-rule bg-paper p-3 font-mono text-sm" />
          <p className="mt-2 text-xs text-ink-3">Works best on clear printed text. Handwriting and tiny fonts are hit-and-miss.</p>
        </Panel>
      </div>
    </ToolPage>
  )
}
