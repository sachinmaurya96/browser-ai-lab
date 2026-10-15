import { useEffect, useState } from 'react'
import { PlainToolPage, FileDrop } from '../../ui/PdfKit'
import { CopyButton, Field, Panel, Segmented, cx, inputClass } from '../../ui/kit'
import { formatBytes } from '../../lib/images'

const ALGOS = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'] as const
type Format = 'hex' | 'base64'

async function digest(algo: string, data: BufferSource, format: Format) {
  const buf = new Uint8Array(await crypto.subtle.digest(algo, data))
  return format === 'hex' ? Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('') : btoa(String.fromCharCode(...buf))
}

async function hmac(algo: string, key: string, data: BufferSource, format: Format) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: algo }, false, ['sign'])
  const buf = new Uint8Array(await crypto.subtle.sign('HMAC', k, data))
  return format === 'hex' ? Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('') : btoa(String.fromCharCode(...buf))
}

export default function HashPage() {
  const [source, setSource] = useState<'text' | 'file'>('text')
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [key, setKey] = useState('')
  const [format, setFormat] = useState<Format>('hex')
  const [compare, setCompare] = useState('')
  const [hashes, setHashes] = useState<Record<string, string>>({})

  useEffect(() => {
    let live = true
    void (async () => {
      const data = source === 'file' ? (file ? await file.arrayBuffer() : null) : new TextEncoder().encode(text)
      if (!data) return setHashes({})
      const entries = await Promise.all(ALGOS.map(async (a) => [a, key ? await hmac(a, key, data, format) : await digest(a, data, format)] as const))
      if (live) setHashes(Object.fromEntries(entries))
    })()
    return () => {
      live = false
    }
  }, [source, text, file, key, format])

  const want = compare.trim().toLowerCase()

  return (
    <PlainToolPage slug="hash">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Panel kicker="Input" title="Text or file" actions={<Segmented label="Source" value={source} onChange={setSource} options={[{ value: 'text', label: 'Text' }, { value: 'file', label: 'File' }]} />}>
          {source === 'text' ? (
            <textarea aria-label="Text to hash" rows={8} spellCheck={false} value={text} onChange={(e) => setText(e.target.value)} className={cx(inputClass, 'font-mono text-sm')} />
          ) : (
            <>
              <FileDrop accept="*/*" label="Drop any file to checksum it" onFiles={(f) => setFile(f[0] ?? null)} compact={!!file} />
              {file && <p className="mt-2 font-mono text-xs text-ink-3">{file.name} · {formatBytes(file.size)}</p>}
            </>
          )}
          <div className="mt-4 space-y-3">
            <Field label="HMAC secret" htmlFor="key" hint="optional"><input id="key" className={cx(inputClass, 'font-mono')} value={key} onChange={(e) => setKey(e.target.value)} placeholder="Leave blank for a plain hash" /></Field>
            <Field label="Compare with" htmlFor="cmp" hint="paste a known checksum"><input id="cmp" className={cx(inputClass, 'font-mono text-sm')} value={compare} onChange={(e) => setCompare(e.target.value)} /></Field>
            <Segmented label="Output" value={format} onChange={setFormat} options={[{ value: 'hex', label: 'Hex' }, { value: 'base64', label: 'Base64' }]} />
          </div>
        </Panel>
        <Panel kicker={key ? 'HMAC' : 'Digest'} title="Results">
          <ul className="space-y-3">
            {ALGOS.map((a) => {
              const h = hashes[a] ?? ''
              const match = want && h.toLowerCase() === want
              return (
                <li key={a} className={cx('rounded-lg border p-3', match ? 'border-sea bg-sea-soft' : 'border-rule')}>
                  <div className="mb-1 flex items-center justify-between"><span className="font-mono text-xs text-ink-3">{a}{match && <span className="ml-2 text-sea">✓ matches</span>}</span><CopyButton text={h} /></div>
                  <code className="block font-mono text-sm break-all">{h || '—'}</code>
                </li>
              )
            })}
          </ul>
          {want && !Object.values(hashes).some((h) => h.toLowerCase() === want) && <p className="mt-3 text-sm text-danger">No algorithm matches the checksum you pasted.</p>}
          <p className="mt-3 text-xs text-ink-3">Uses the browser's Web Crypto API. Verify downloads, sign webhooks, or fingerprint files without uploading them.</p>
        </Panel>
      </div>
    </PlainToolPage>
  )
}
