import { useState } from 'react'
import { ArrowLeftRight, Languages } from 'lucide-react'
import { usePipeline, useTask } from '../../lib/hooks'
import { ToolPage } from '../../ui/ToolPage'
import { Button, CopyButton, Panel, cx, inputClass } from '../../ui/kit'

// FLORES-200 codes used by NLLB. A curated subset of the 200 supported.
const LANGS: [string, string][] = [
  ['eng_Latn', 'English'], ['hin_Deva', 'Hindi'], ['spa_Latn', 'Spanish'], ['fra_Latn', 'French'], ['deu_Latn', 'German'],
  ['por_Latn', 'Portuguese'], ['ita_Latn', 'Italian'], ['rus_Cyrl', 'Russian'], ['zho_Hans', 'Chinese (Simplified)'], ['jpn_Jpan', 'Japanese'],
  ['kor_Hang', 'Korean'], ['arb_Arab', 'Arabic'], ['ben_Beng', 'Bengali'], ['urd_Arab', 'Urdu'], ['tam_Taml', 'Tamil'],
  ['tel_Telu', 'Telugu'], ['mar_Deva', 'Marathi'], ['guj_Gujr', 'Gujarati'], ['pan_Guru', 'Punjabi'], ['tur_Latn', 'Turkish'],
  ['vie_Latn', 'Vietnamese'], ['ind_Latn', 'Indonesian'], ['tha_Thai', 'Thai'], ['pol_Latn', 'Polish'], ['ukr_Cyrl', 'Ukrainian'],
  ['nld_Latn', 'Dutch'], ['swe_Latn', 'Swedish'], ['ell_Grek', 'Greek'], ['heb_Hebr', 'Hebrew'], ['pes_Arab', 'Persian'],
  ['swh_Latn', 'Swahili'], ['fil_Latn', 'Filipino'], ['nep_Deva', 'Nepali'], ['mal_Mlym', 'Malayalam'], ['kan_Knda', 'Kannada'],
]

export default function TranslatePage() {
  const { model, callWith } = usePipeline({ task: 'translation', model: 'Xenova/nllb-200-distilled-600M', dtype: { wasm: 'q8' }, webgpu: false })
  const task = useTask()
  const [src, setSrc] = useState('eng_Latn')
  const [tgt, setTgt] = useState('hin_Deva')
  const [text, setText] = useState('')
  const [out, setOut] = useState('')
  const [progress, setProgress] = useState('')

  const run = () =>
    task.go(async () => {
      setOut('')
      // Translate paragraph by paragraph: the model handles ~400 words at a time.
      const paras = text.split(/\n+/)
      const done: string[] = []
      for (let i = 0; i < paras.length; i++) {
        setProgress(paras.length > 1 ? `${i + 1}/${paras.length}` : '')
        if (!paras[i].trim()) continue
        const [r] = await callWith<{ translation_text: string }[]>([paras[i]], { src_lang: src, tgt_lang: tgt, max_new_tokens: 512 })
        done.push(r.translation_text)
        setOut(done.join('\n\n'))
      }
      setProgress('')
    })

  const select = (value: string, set: (v: string) => void, label: string) => (
    <select aria-label={label} value={value} onChange={(e) => set(e.target.value)} className={cx(inputClass, 'w-auto py-1.5 text-sm')}>
      {LANGS.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
    </select>
  )

  return (
    <ToolPage slug="translate" model={model} error={task.error} info={{ name: 'Xenova/nllb-200-distilled-600M', href: 'https://huggingface.co/Xenova/nllb-200-distilled-600M', size: '~650 MB', task: 'translation · 200 languages' }}>
      <div className="flex flex-wrap items-center gap-2">
        {select(src, setSrc, 'From')}
        <Button size="sm" tone="ghost" aria-label="Swap languages" onClick={() => { setSrc(tgt); setTgt(src); setText(out); setOut(text) }}><ArrowLeftRight size={16} /></Button>
        {select(tgt, setTgt, 'To')}
        <Button tone="primary" className="ml-auto" disabled={!text.trim() || task.busy} onClick={() => void run()}>
          <Languages size={16} /> {task.busy ? `Translating ${progress}…` : 'Translate'}
        </Button>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel kicker="Source" title={LANGS.find((l) => l[0] === src)?.[1]}>
          <textarea aria-label="Text to translate" rows={12} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type or paste text…" className={cx(inputClass, 'leading-relaxed')} />
        </Panel>
        <Panel kicker="Translation" title={LANGS.find((l) => l[0] === tgt)?.[1]} actions={<CopyButton text={out} />}>
          <div className="min-h-[280px] rounded-lg border border-rule bg-paper p-3 leading-relaxed whitespace-pre-wrap">{out || <span className="text-ink-3">{task.busy ? 'Working…' : 'Translation appears here.'}</span>}</div>
        </Panel>
      </div>
    </ToolPage>
  )
}
