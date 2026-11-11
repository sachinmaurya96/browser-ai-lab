/**
 * Download a file once and keep it in Cache Storage, reporting byte progress.
 * Used for model files that Transformers.js doesn't manage for us.
 */
export async function cachedFetch(url: string, onBytes: (loaded: number, total: number) => void = () => undefined, cacheName = 'lab-models'): Promise<ArrayBuffer> {
  let cache: Cache | null = null
  try {
    cache = await caches.open(cacheName)
    const hit = await cache.match(url)
    if (hit) {
      const buf = await hit.arrayBuffer()
      onBytes(buf.byteLength, buf.byteLength)
      return buf
    }
  } catch {
    /* Cache Storage unavailable (private mode): just download */
  }
  const res = await fetch(url)
  if (!res.ok || !res.body) throw new Error(`Download failed (${res.status}) for ${url.split('/').pop()}`)
  const total = Number(res.headers.get('content-length')) || 0
  const reader = res.body.getReader()
  const parts: Uint8Array[] = []
  let loaded = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    parts.push(value)
    loaded += value.length
    onBytes(loaded, total || loaded)
  }
  const buf = new Uint8Array(loaded)
  let o = 0
  for (const p of parts) {
    buf.set(p, o)
    o += p.length
  }
  parts.length = 0
  try {
    await cache?.put(url, new Response(buf))
  } catch {
    /* quota exceeded: fine, it just won't be cached */
  }
  return buf.buffer
}
