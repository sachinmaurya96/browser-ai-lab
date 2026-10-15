import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Download } from 'lucide-react'
import { PlainToolPage } from '../../ui/PdfKit'
import { saveBlob } from '../../lib/images'
import { Button, Field, Panel, Segmented, cx, inputClass } from '../../ui/kit'

type Kind = 'text' | 'wifi' | 'upi' | 'email' | 'phone'
type Level = 'L' | 'M' | 'Q' | 'H'

// Escape special characters in the WIFI: payload format.
const wifiEsc = (s: string) => s.replace(/([\\;,:"])/g, '\\$1')

export default function QrPage() {
  const [kind, setKind] = useState<Kind>('text')
  const [text, setText] = useState('https://example.com')
  const [ssid, setSsid] = useState('')
  const [pass, setPass] = useState('')
  const [security, setSecurity] = useState('WPA')
  const [upi, setUpi] = useState({ id: '', name: '', amount: '' })
  const [email, setEmail] = useState({ to: '', subject: '' })
  const [phone, setPhone] = useState('')
  const [fg, setFg] = useState('#1b1a17')
  const [bg, setBg] = useState('#ffffff')
  const [level, setLevel] = useState<Level>('M')
  const [svg, setSvg] = useState('')
  const [error, setError] = useState<string | null>(null)

  const payload =
    kind === 'text' ? text
    : kind === 'wifi' ? (ssid ? `WIFI:T:${security};S:${wifiEsc(ssid)};P:${wifiEsc(pass)};;` : '')
    : kind === 'upi' ? (upi.id ? `upi://pay?pa=${encodeURIComponent(upi.id)}&pn=${encodeURIComponent(upi.name)}${upi.amount ? `&am=${encodeURIComponent(upi.amount)}` : ''}&cu=INR` : '')
    : kind === 'email' ? (email.to ? `mailto:${email.to}${email.subject ? `?subject=${encodeURIComponent(email.subject)}` : ''}` : '')
    : phone ? `tel:${phone.replace(/\s/g, '')}` : ''

  useEffect(() => {
    if (!payload) return setSvg('')
    QRCode.toString(payload, { type: 'svg', errorCorrectionLevel: level, margin: 2, color: { dark: fg, light: bg } })
      .then((s) => {
        setSvg(s)
        setError(null)
      })
      .catch((e: Error) => setError(e.message))
  }, [payload, level, fg, bg])

  const png = async () => {
    const url = await QRCode.toDataURL(payload, { errorCorrectionLevel: level, margin: 2, width: 1024, color: { dark: fg, light: bg } })
    saveBlob(await (await fetch(url)).blob(), 'qr-code.png')
  }

  return (
    <PlainToolPage slug="qr" error={error}>
      <Segmented label="Type" value={kind} onChange={setKind} options={[{ value: 'text', label: 'URL / Text' }, { value: 'wifi', label: 'Wi-Fi' }, { value: 'upi', label: 'UPI payment' }, { value: 'email', label: 'Email' }, { value: 'phone', label: 'Phone' }]} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <Panel kicker="Content" title="What should it open?">
          <div className="space-y-4">
            {kind === 'text' && <textarea aria-label="Text or URL" rows={5} className={inputClass} value={text} onChange={(e) => setText(e.target.value)} />}
            {kind === 'wifi' && (
              <>
                <Field label="Network name (SSID)" htmlFor="ssid"><input id="ssid" className={inputClass} value={ssid} onChange={(e) => setSsid(e.target.value)} /></Field>
                <Field label="Password" htmlFor="pw"><input id="pw" className={inputClass} value={pass} onChange={(e) => setPass(e.target.value)} /></Field>
                <select aria-label="Security" className={inputClass} value={security} onChange={(e) => setSecurity(e.target.value)}><option value="WPA">WPA/WPA2/WPA3</option><option value="WEP">WEP</option><option value="nopass">None</option></select>
              </>
            )}
            {kind === 'upi' && (
              <>
                <Field label="UPI ID" htmlFor="vpa"><input id="vpa" className={inputClass} placeholder="name@bank" value={upi.id} onChange={(e) => setUpi({ ...upi, id: e.target.value })} /></Field>
                <Field label="Payee name" htmlFor="pn"><input id="pn" className={inputClass} value={upi.name} onChange={(e) => setUpi({ ...upi, name: e.target.value })} /></Field>
                <Field label="Amount (₹)" htmlFor="am" hint="optional"><input id="am" inputMode="decimal" className={inputClass} value={upi.amount} onChange={(e) => setUpi({ ...upi, amount: e.target.value })} /></Field>
              </>
            )}
            {kind === 'email' && (
              <>
                <Field label="To" htmlFor="to"><input id="to" className={inputClass} value={email.to} onChange={(e) => setEmail({ ...email, to: e.target.value })} /></Field>
                <Field label="Subject" htmlFor="sub"><input id="sub" className={inputClass} value={email.subject} onChange={(e) => setEmail({ ...email, subject: e.target.value })} /></Field>
              </>
            )}
            {kind === 'phone' && <Field label="Phone number" htmlFor="tel"><input id="tel" className={inputClass} placeholder="+91 98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>}
          </div>
          <div className="mt-6 flex flex-wrap items-end gap-4">
            <label className="text-sm">Colour <input type="color" value={fg} onChange={(e) => setFg(e.target.value)} className="ml-1 h-8 w-10 rounded border border-rule align-middle" /></label>
            <label className="text-sm">Background <input type="color" value={bg} onChange={(e) => setBg(e.target.value)} className="ml-1 h-8 w-10 rounded border border-rule align-middle" /></label>
            <Segmented label="Error correction" value={level} onChange={setLevel} options={[{ value: 'L', label: 'L 7%' }, { value: 'M', label: 'M 15%' }, { value: 'Q', label: 'Q 25%' }, { value: 'H', label: 'H 30%' }]} />
          </div>
          <p className="mt-2 text-xs text-ink-3">Higher error correction survives scratches or a logo on top, at the cost of a denser code. Keep strong contrast so phones can scan it.</p>
        </Panel>
        <Panel kicker="QR code" title="Preview">
          <div className={cx('mx-auto grid aspect-square max-w-sm place-items-center rounded-xl border border-rule', !svg && 'paper-grid')}>
            {svg ? <div className="size-full [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: svg }} /> : <span className="text-sm text-ink-3">Fill in the details</span>}
          </div>
          <div className="mt-4 flex gap-2">
            <Button tone="primary" className="flex-1" disabled={!svg} onClick={() => void png()}><Download size={16} /> PNG</Button>
            <Button tone="outline" className="flex-1" disabled={!svg} onClick={() => saveBlob(new Blob([svg], { type: 'image/svg+xml' }), 'qr-code.svg')}><Download size={16} /> SVG</Button>
          </div>
          {payload && <p className="mt-3 font-mono text-[11px] break-all text-ink-3">{payload}</p>}
        </Panel>
      </div>
    </PlainToolPage>
  )
}
