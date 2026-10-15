import { useState } from 'react'
import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib'
import { Stamp } from 'lucide-react'
import { pdfStem, savePdf } from '../../lib/pdf'
import { useTask } from '../../lib/hooks'
import { FileBadge, FileDrop, PlainToolPage, Thumb, usePdf } from '../../ui/PdfKit'
import { Button, Field, Panel, cx, inputClass } from '../../ui/kit'

type Pos = 'bottom-center' | 'bottom-right' | 'top-right'

const hex = (h: string) => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255)

export default function StampPage() {
  const pdf = usePdf()
  const task = useTask()
  const [mark, setMark] = useState(true)
  const [text, setText] = useState('CONFIDENTIAL')
  const [color, setColor] = useState('#e8553a')
  const [opacity, setOpacity] = useState(0.18)
  const [size, setSize] = useState(64)
  const [numbers, setNumbers] = useState(true)
  const [pos, setPos] = useState<Pos>('bottom-center')
  const [format, setFormat] = useState('Page {n} of {total}')

  const run = () =>
    task.go(async () => {
      const doc = await PDFDocument.load(await pdf.file!.arrayBuffer(), { ignoreEncryption: true })
      const bold = await doc.embedFont(StandardFonts.HelveticaBold)
      const regular = await doc.embedFont(StandardFonts.Helvetica)
      const pages = doc.getPages()
      pages.forEach((page, i) => {
        const { width, height } = page.getSize()
        if (mark && text.trim()) {
          const w = bold.widthOfTextAtSize(text, size)
          // Centre the diagonal text: offset by half its rotated extent.
          const a = Math.PI / 4
          page.drawText(text, { x: width / 2 - (w / 2) * Math.cos(a) + (size / 3) * Math.sin(a), y: height / 2 - (w / 2) * Math.sin(a) - (size / 3) * Math.cos(a), size, font: bold, color: hex(color), opacity, rotate: degrees(45) })
        }
        if (numbers) {
          const label = format.replace('{n}', String(i + 1)).replace('{total}', String(pages.length))
          const fs = 10
          const w = regular.widthOfTextAtSize(label, fs)
          const x = pos === 'bottom-center' ? (width - w) / 2 : width - w - 36
          const y = pos === 'top-right' ? height - 28 : 22
          page.drawText(label, { x, y, size: fs, font: regular, color: rgb(0.35, 0.35, 0.35) })
        }
      })
      savePdf(await doc.save(), `${pdfStem(pdf.file!.name)}-stamped.pdf`)
    })

  return (
    <PlainToolPage slug="pdf-stamp" error={task.error ?? pdf.error}>
      {!pdf.doc || !pdf.file ? (
        <FileDrop onFiles={(f) => void pdf.load(f[0])} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <Panel kicker="Preview" title="First page (watermark preview is approximate)">
            <div className="relative mx-auto max-w-sm">
              <Thumb doc={pdf.doc} page={1} width={380} />
              {mark && <span className="pointer-events-none absolute inset-0 grid place-items-center overflow-hidden"><span className="-rotate-45 font-bold whitespace-nowrap" style={{ color, opacity, fontSize: size / 2.2 }}>{text}</span></span>}
              {numbers && <span className={cx('absolute font-mono text-[9px] text-ink-3', pos === 'top-right' ? 'top-2 right-4' : pos === 'bottom-right' ? 'right-4 bottom-2' : 'bottom-2 left-1/2 -translate-x-1/2')}>{format.replace('{n}', '1').replace('{total}', String(pdf.doc.numPages))}</span>}
            </div>
          </Panel>
          <div className="space-y-4">
            <FileBadge file={pdf.file} pages={pdf.doc.numPages} onClear={pdf.clear} />
            <Panel kicker="Watermark" title={<label className="flex items-center gap-2"><input type="checkbox" checked={mark} onChange={(e) => setMark(e.target.checked)} className="accent-[var(--accent)]" /> Diagonal text</label>}>
              <div className={cx('space-y-3', !mark && 'pointer-events-none opacity-40')}>
                <input aria-label="Watermark text" className={inputClass} value={text} onChange={(e) => setText(e.target.value)} />
                <div className="flex items-center gap-3"><input aria-label="Colour" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-12 rounded border border-rule" /><Field label="Opacity" htmlFor="op" hint={`${Math.round(opacity * 100)}%`}><input id="op" type="range" min={0.05} max={0.6} step={0.01} value={opacity} onChange={(e) => setOpacity(+e.target.value)} className="w-full accent-[var(--accent)]" /></Field></div>
                <Field label="Size" htmlFor="sz" hint={`${size} pt`}><input id="sz" type="range" min={24} max={120} value={size} onChange={(e) => setSize(+e.target.value)} className="w-full accent-[var(--accent)]" /></Field>
              </div>
            </Panel>
            <Panel kicker="Numbering" title={<label className="flex items-center gap-2"><input type="checkbox" checked={numbers} onChange={(e) => setNumbers(e.target.checked)} className="accent-[var(--accent)]" /> Page numbers</label>}>
              <div className={cx('space-y-3', !numbers && 'pointer-events-none opacity-40')}>
                <input aria-label="Number format" className={inputClass} value={format} onChange={(e) => setFormat(e.target.value)} />
                <select aria-label="Position" className={inputClass} value={pos} onChange={(e) => setPos(e.target.value as Pos)}>
                  <option value="bottom-center">Bottom centre</option><option value="bottom-right">Bottom right</option><option value="top-right">Top right</option>
                </select>
              </div>
            </Panel>
            <Button className="w-full" tone="primary" disabled={task.busy || (!mark && !numbers)} onClick={() => void run()}><Stamp size={16} /> {task.busy ? 'Applying…' : 'Apply & download'}</Button>
          </div>
        </div>
      )}
    </PlainToolPage>
  )
}
