/** Shared shapes for Ask PDF's retrieval pipeline (UI thread and workers). */

/** A run of page text and where it sits on the page, for highlighting. */
export interface TextBox {
  /** Character range in the page's `text`. */
  start: number
  end: number
  /** Fractions of the page size, top-left origin. */
  x: number
  y: number
  w: number
  h: number
}

export interface PageText {
  /** 1-based. */
  page: number
  text: string
  /** Empty when the page is rotated or has no text layer. */
  boxes: TextBox[]
  /** Page width / height, so the viewer can reserve space before rendering. */
  aspect: number
}

export interface DocumentChunk {
  id: string
  text: string
  pageNumbers: number[]
  /** Offsets into the document text (pages joined by PAGE_SEP). */
  startOffset?: number
  endOffset?: number
  embedding?: Float32Array
}

/** One or more adjacent chunks handed to the model as a single source. */
export interface Passage {
  chunkIds: string[]
  pageNumbers: number[]
  start: number
  end: number
  text: string
  score: number
}

/** Pages are joined with a paragraph break, so offsets line up with chunking. */
export const PAGE_SEP = '\n\n'
