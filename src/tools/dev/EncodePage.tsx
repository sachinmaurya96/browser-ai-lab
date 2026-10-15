import { useMemo, useState } from 'react'
import { ArrowLeftRight } from 'lucide-react'
import { PlainToolPage } from '../../ui/PdfKit'
import { Button, CopyButton, Notice, Panel, Segmented, cx, inputClass } from '../../ui/kit'

type Codec = 'base64' | 'base64url' | 'url' | 'html' | 'hex' | 'unicode'

const enc = new TextEncoder()
const dec = new TextDecoder()
const bytesToB64 = (b: Uint8Array) => btoa(Array.from(b, (c) => String.fromCharCode(c)).join(''))
const b64ToBytes = (s: string) => Uint8Array.from(atob(s.replace(/\s/g, '')), (c) => c.charCodeAt(0))

const CODECS: Record<Codec, { label: string; encode: (s: string) => string; decode: (s: string) => string }> = {
  base64: { label: 'Base64', encode: (s) => bytesToB64(enc.encode(s)), decode: (s) => dec.decode(b64ToBytes(s)) },
  base64url: {
    label: 'Base64URL',
    encode: (s) => bytesToB64(enc.encode(s)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
    decode: (s) => dec.decode(b64ToBytes(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '='))),
  },
  url: { label: 'URL', encode: encodeURIComponent, decode: (s) => decodeURIComponent(s.replace(/\+/g, ' ')) },
  html: {
    label: 'HTML entities',
    encode: (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!),
    decode: (s) => new DOMParser().parseFromString(`<!doctype html><body>${s}`, 'text/html').body.textContent ?? '',
  },
  hex: {
    label: 'Hex',
    encode: (s) => Array.from(enc.encode(s), (b) => b.toString(16).padStart(2, '0')).join(' '),
    decode: (s) => dec.decode(Uint8Array.from(s.replace(/[^0-9a-f]/gi, '').match(/../g) ?? [], (h) => parseInt(h, 16))),
  },
  unicode: {
    label: 'Unicode escapes',
    encode: (s) => [...s].map((c) => (c.charCodeAt(0) < 128 ? c : `\\u{${c.codePointAt(0)!.toString(16)}}`)).join(''),
    decode: (s) => s.replace(/\\u\{([0-9a-f]+)\}|\\u([0-9a-f]{4})/gi, (_, a, b) => String.fromCodePoint(parseInt(a ?? b, 16))),
  },
}

export default function EncodePage() {
  const [codec, setCodec] = useState<Codec>('base64')
  const [mode, setMode] = useState<'encode' | 'decode'>('encode')
  const [input, setInput] = useState('')

  const out = useMemo(() => {
    if (!input) return { text: '' }
    try {
      return { text: CODECS[codec][mode](input) }
    } catch {
      return { text: '', error: `This doesn't look like valid ${CODECS[codec].label} input.` }
    }
  }, [input, codec, mode])

  return (
    <PlainToolPage slug="encode">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented label="Format" value={codec} onChange={setCodec} options={(Object.keys(CODECS) as Codec[]).map((c) => ({ value: c, label: CODECS[c].label }))} />
        <Segmented label="Direction" value={mode} onChange={setMode} options={[{ value: 'encode', label: 'Encode' }, { value: 'decode', label: 'Decode' }]} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel kicker="Input" title={mode === 'encode' ? 'Plain text' : CODECS[codec].label}>
          <textarea aria-label="Input" spellCheck={false} rows={14} value={input} onChange={(e) => setInput(e.target.value)} className={cx(inputClass, 'font-mono text-sm')} />
          <p className="mt-1 font-mono text-[11px] text-ink-3">{input.length} chars · {enc.encode(input).length} bytes</p>
        </Panel>
        <Panel
          kicker="Output"
          title={mode === 'encode' ? CODECS[codec].label : 'Plain text'}
          actions={<><Button size="sm" tone="ghost" disabled={!out.text} onClick={() => { setInput(out.text); setMode(mode === 'encode' ? 'decode' : 'encode') }}><ArrowLeftRight size={14} /> Swap</Button><CopyButton text={out.text} /></>}
        >
          {out.error ? <Notice tone="error">{out.error}</Notice> : <pre className="min-h-[300px] overflow-auto rounded-lg border border-rule bg-paper p-3 font-mono text-sm break-all whitespace-pre-wrap">{out.text}</pre>}
        </Panel>
      </div>
    </PlainToolPage>
  )
}
