/** PDF helpers: pdf.js for reading/rendering, pdf-lib for writing. */
import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { saveBlob } from './images'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

export type PdfDoc = pdfjs.PDFDocumentProxy

export async function openPdf(file: Blob | ArrayBuffer): Promise<PdfDoc> {
  const data = file instanceof Blob ? await file.arrayBuffer() : file
  // pdf.js takes ownership of the buffer, so hand it a copy.
  return pdfjs.getDocument({ data: new Uint8Array(data.slice(0)) }).promise
}

/** Render page `n` (1-based) to a canvas at roughly `width` pixels wide. */
export async function renderPage(doc: PdfDoc, n: number, width = 1200): Promise<HTMLCanvasElement> {
  const page = await doc.getPage(n)
  const base = page.getViewport({ scale: 1 })
  const viewport = page.getViewport({ scale: width / base.width })
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(viewport.width)
  canvas.height = Math.round(viewport.height)
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  await page.render({ canvas, canvasContext: ctx, viewport }).promise
  return canvas
}

/** Plain text of every page, keeping rough line breaks. */
export async function pdfText(doc: PdfDoc, onPage?: (n: number) => void): Promise<string[]> {
  const pages: string[] = []
  for (let n = 1; n <= doc.numPages; n++) {
    onPage?.(n)
    const content = await (await doc.getPage(n)).getTextContent()
    let text = ''
    for (const item of content.items) {
      if (!('str' in item)) continue
      text += item.str + (item.hasEOL ? '\n' : ' ')
    }
    pages.push(text.replace(/[ \t]+\n/g, '\n').replace(/[ \t]{2,}/g, ' ').trim())
  }
  return pages
}

/** Parse "1-3, 5, 8-" into sorted unique 1-based page numbers. */
export function parseRanges(spec: string, total: number): number[] {
  const out = new Set<number>()
  for (const part of spec.split(',').map((s) => s.trim()).filter(Boolean)) {
    const m = part.match(/^(\d*)\s*-\s*(\d*)$/)
    if (m) {
      const a = m[1] ? +m[1] : 1
      const b = m[2] ? +m[2] : total
      for (let i = Math.max(1, a); i <= Math.min(total, b); i++) out.add(i)
    } else if (/^\d+$/.test(part) && +part >= 1 && +part <= total) out.add(+part)
  }
  return [...out].sort((x, y) => x - y)
}

export function savePdf(bytes: Uint8Array, name: string) {
  saveBlob(new Blob([bytes as BlobPart], { type: 'application/pdf' }), name)
}

export const pdfStem = (name: string) => name.replace(/\.pdf$/i, '') || 'document'
