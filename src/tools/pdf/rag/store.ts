/**
 * Opt-in, on-device storage of a PDF's index (chunk text + embeddings) in
 * IndexedDB, keyed by a hash of the file. Nothing is saved unless the user
 * ticks "Remember"; every call fails soft (private mode, blocked storage).
 */
import type { DocumentChunk } from './types'

export interface SavedIndex {
  key: string
  name: string
  savedAt: number
  chunks: Omit<DocumentChunk, 'embedding'>[]
  vectors: Float32Array
  dim: number
}

const DB = 'ask-pdf'
const STORE = 'indexes'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'key' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  try {
    const db = await open()
    return await new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE))
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    }).finally(() => db.close())
  } catch {
    return undefined
  }
}

export const loadIndex = (key: string) => tx<SavedIndex | undefined>('readonly', (s) => s.get(key))
export const saveIndex = (v: SavedIndex) => tx('readwrite', (s) => s.put(v))
export const countIndexes = async () => (await tx('readonly', (s) => s.count())) ?? 0
export const clearIndexes = () => tx('readwrite', (s) => s.clear())

/** SHA-256 of the file bytes. */
export async function fileHash(file: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** A saved index is only reused with the same embedder build and chunker. */
export const indexKey = (hash: string, variant: string, version: number) => `${hash}|${variant}|v${version}`
