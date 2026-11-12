/**
 * Page text with positions. Like `pdfText` in lib/pdf, but it rebuilds the
 * text item by item so every character offset maps back to a box on the page,
 * and repairs the usual extraction artefacts (hyphenated line breaks,
 * ligatures, stray whitespace) without inventing anything.
 */
import * as pdfjs from 'pdfjs-dist'
import type { PdfDoc } from '../../../lib/pdf'
import { PAGE_SEP, type PageText, type TextBox } from './types'

interface Item {
  str: string
  transform: number[]
  width: number
  hasEOL: boolean
}

/** Letters/digits needed before a page counts as having a usable text layer. */
const MIN_CHARS = 12

function clean(s: string) {
  return s
    .normalize('NFKC') // ﬁ → fi, full-width forms, etc.
    .replace(/­/g, '') // soft hyphens
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f�]/g, '')
    .replace(/\s+/g, ' ')
}

export async function extractPage(doc: PdfDoc, n: number): Promise<PageText> {
  const page = await doc.getPage(n)
  const viewport = page.getViewport({ scale: 1 })
  const content = await page.getTextContent()
  // Boxes are only reliable for upright pages; rotated ones fall back to quoting.
  const upright = viewport.rotation % 360 === 0

  let text = ''
  const boxes: TextBox[] = []
  let prev: { right: number; baseline: number; height: number } | null = null
  let lineBreak = false

  for (const raw of content.items) {
    if (!('str' in raw)) continue
    const item = raw as Item
    const str = clean(item.str)
    const tx = pdfjs.Util.transform(viewport.transform, item.transform)
    const height = Math.hypot(tx[2], tx[3]) || 1
    const x = tx[4]
    const baseline = tx[5]

    if (str.trim()) {
      if (text) {
        const newLine = lineBreak || !prev || Math.abs(baseline - prev.baseline) > prev.height * 0.5
        if (newLine) {
          // A gap of well over a line height is a paragraph break.
          const gap = prev ? baseline - prev.baseline : 0
          const para = prev && (gap > prev.height * 1.8 || gap < -prev.height)
          if (!para && /\p{L}-$/u.test(text) && /^\p{Ll}/u.test(str)) {
            text = text.slice(0, -1) // re-join "exam-\nple"
            const last = boxes.at(-1)
            if (last && last.end > text.length) last.end = text.length
          } else {
            text = text.trimEnd() + (para ? '\n\n' : ' ')
          }
        } else if (!/\s$/.test(text) && !/^\s/.test(str) && prev && x - prev.right > height * 0.15) {
          text += ' '
        }
      }
      const piece = text && !/\s$/.test(text) ? str : str.trimStart()
      const start = text.length
      text += piece
      if (upright) {
        boxes.push({
          start,
          end: text.length,
          x: x / viewport.width,
          y: (baseline - height) / viewport.height,
          w: item.width / viewport.width,
          h: (height * 1.2) / viewport.height,
        })
      }
      prev = { right: x + item.width, baseline, height }
      lineBreak = false
    }
    if (item.hasEOL) lineBreak = true
  }
  page.cleanup()
  return { page: n, text: text.trim(), boxes, aspect: viewport.width / viewport.height }
}

export const hasText = (p: PageText) => (p.text.match(/[\p{L}\p{N}]/gu)?.length ?? 0) >= MIN_CHARS

/**
 * Read every page, yielding to the event loop between pages so the UI keeps
 * painting. Stops early when `signal` aborts.
 */
export async function extractPages(doc: PdfDoc, onPage: (n: number) => void, signal: AbortSignal): Promise<PageText[]> {
  const pages: PageText[] = []
  for (let n = 1; n <= doc.numPages; n++) {
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError')
    onPage(n)
    pages.push(await extractPage(doc, n))
    await new Promise((r) => setTimeout(r, 0))
  }
  return pages
}

/** Start offset of each page in the joined document text. */
export function pageStarts(pages: { text: string }[]): number[] {
  const starts: number[] = []
  let o = 0
  for (const p of pages) {
    starts.push(o)
    o += p.text.length + PAGE_SEP.length
  }
  return starts
}

export const joinPages = (pages: { text: string }[]) => pages.map((p) => p.text).join(PAGE_SEP)
