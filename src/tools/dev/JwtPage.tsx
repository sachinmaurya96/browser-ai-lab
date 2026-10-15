import { useMemo, useState } from 'react'
import { PlainToolPage } from '../../ui/PdfKit'
import { Chip, CopyButton, Notice, Panel, Tag, cx, inputClass } from '../../ui/kit'

// A harmless demo token (signature is not valid for any real key).
const SAMPLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzEyMyIsIm5hbWUiOiJBZGEgTG92ZWxhY2UiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NjAwMDAwMDAsImV4cCI6MTc2MDAwMzYwMH0.sig'

const CLAIMS: Record<string, string> = { iss: 'Issuer', sub: 'Subject', aud: 'Audience', exp: 'Expires', nbf: 'Not before', iat: 'Issued at', jti: 'Token ID' }

function b64url(part: string): unknown {
  const b64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=')
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
  return JSON.parse(new TextDecoder().decode(bytes))
}

function ago(sec: number) {
  const d = sec * 1000 - Date.now()
  const abs = Math.abs(d) / 1000
  const [n, u] = abs < 3600 ? [abs / 60, 'min'] : abs < 86400 ? [abs / 3600, 'h'] : [abs / 86400, 'd']
  return d > 0 ? `in ${n.toFixed(0)} ${u}` : `${n.toFixed(0)} ${u} ago`
}

type Decoded = { error: string } | { header: Record<string, unknown>; payload: Record<string, unknown>; signature: string }

export default function JwtPage() {
  const [token, setToken] = useState('')
  const decoded = useMemo((): Decoded | null => {
    const t = token.trim().replace(/^Bearer\s+/i, '')
    if (!t) return null
    const parts = t.split('.')
    if (parts.length !== 3) return { error: 'A JWT has three dot-separated parts: header.payload.signature.' }
    try {
      return { header: b64url(parts[0]) as Record<string, unknown>, payload: b64url(parts[1]) as Record<string, unknown>, signature: parts[2] }
    } catch {
      return { error: 'Could not decode. Is this a valid base64url JWT?' }
    }
  }, [token])

  const p = decoded && 'payload' in decoded ? decoded.payload : null
  const exp = typeof p?.exp === 'number' ? p.exp : null
  const expired = exp !== null && exp * 1000 < Date.now()

  return (
    <PlainToolPage slug="jwt">
      <Notice tone="info">Decoding happens only in this tab, so it's safe for real tokens. This tool reads the token; it does not verify the signature.</Notice>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel kicker="Token" title="Paste a JWT" actions={<Chip onClick={() => setToken(SAMPLE)}>Sample</Chip>}>
          <textarea aria-label="JWT" spellCheck={false} rows={10} value={token} onChange={(e) => setToken(e.target.value)} placeholder="eyJhbGciOi…" className={cx(inputClass, 'font-mono text-sm break-all')} />
          {decoded && 'error' in decoded && <div className="mt-3"><Notice tone="error">{decoded.error}</Notice></div>}
          {exp !== null && (
            <p className="mt-3 flex items-center gap-2 text-sm">
              <Tag tone={expired ? 'accent' : 'sea'}>{expired ? 'Expired' : 'Valid time'}</Tag>
              {expired ? 'expired' : 'expires'} {ago(exp)} · {new Date(exp * 1000).toLocaleString()}
            </p>
          )}
        </Panel>
        <div className="space-y-6">
          {decoded && 'header' in decoded && (
            <>
              <Panel kicker="Header" title={`${String(decoded.header.alg ?? '?')} · ${String(decoded.header.typ ?? 'JWT')}`} actions={<CopyButton text={JSON.stringify(decoded.header, null, 2)} />}>
                <pre className="overflow-auto font-mono text-sm text-accent">{JSON.stringify(decoded.header, null, 2)}</pre>
              </Panel>
              <Panel kicker="Payload" title="Claims" actions={<CopyButton text={JSON.stringify(decoded.payload, null, 2)} />}>
                <table className="w-full text-sm">
                  <tbody>
                    {Object.entries(decoded.payload).map(([k, v]) => (
                      <tr key={k} className="border-b border-rule last:border-0">
                        <td className="py-1.5 pr-3 align-top font-mono text-sea">{k}</td>
                        <td className="py-1.5 font-mono break-all">
                          {JSON.stringify(v)}
                          {['exp', 'iat', 'nbf'].includes(k) && typeof v === 'number' && <span className="block text-xs text-ink-3">{new Date(v * 1000).toLocaleString()} ({ago(v)})</span>}
                        </td>
                        <td className="py-1.5 pl-2 text-right text-xs text-ink-3">{CLAIMS[k]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>
            </>
          )}
          {!decoded && <p className="py-16 text-center text-sm text-ink-3">The decoded header and claims appear here.</p>}
        </div>
      </div>
    </PlainToolPage>
  )
}
