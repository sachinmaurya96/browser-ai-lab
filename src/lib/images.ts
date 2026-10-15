/** Browser-side image helpers shared by the image tools. */

export const ACCEPTED_IMAGES = ['image/png', 'image/jpeg', 'image/webp']
export const MAX_FILE_MB = 25

export interface PreparedImage {
  /** Object URL of an orientation-corrected, size-capped PNG/JPEG. */
  url: string
  width: number
  height: number
  name: string
  bytes: number
}

export function validateImage(file: File): string | null {
  if (!ACCEPTED_IMAGES.includes(file.type)) return 'Use a PNG, JPEG or WebP image.'
  if (file.size > MAX_FILE_MB * 1024 * 1024) return `Images must be under ${MAX_FILE_MB} MB.`
  return null
}

/**
 * Decode a file with EXIF orientation applied and cap its longest side at
 * `maxSide`. Re-encoding through a canvas gives the worker a predictable,
 * upright image and keeps memory in check for phone photos.
 */
export async function prepareImage(file: File, maxSide = 2048): Promise<PreparedImage> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not available in this browser.')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  // Keep PNG for sources that may carry transparency, JPEG for the rest.
  const type = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png'
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, type, 0.92))
  if (!blob) throw new Error('Could not read this image.')

  return { url: URL.createObjectURL(blob), width, height, name: file.name, bytes: file.size }
}

export function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Image failed to load.'))
    img.src = url
  })
}

export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function stem(filename: string): string {
  return filename.replace(/\.[^.]+$/, '').trim() || 'image'
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(0)} KB`
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`
  return `${(n / 1024 ** 3).toFixed(2)} GB`
}
