import { loadImageElement } from '../../lib/images'

export interface MatteOptions {
  /** Pixels with alpha below this become fully transparent (0–255). */
  floor: number
  /** Optional solid background; null keeps transparency. */
  fill: string | null
}

/**
 * Apply an alpha matte to the source image and encode a PNG. Soft edge values
 * are kept, so hair and fur fade out instead of looking cut with scissors.
 */
export async function renderCutout(srcUrl: string, alpha: Uint8ClampedArray, width: number, height: number, opts: MatteOptions) {
  const img = await loadImageElement(srcUrl)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas is not available in this browser.')

  ctx.drawImage(img, 0, 0, width, height)
  const frame = ctx.getImageData(0, 0, width, height)
  const px = frame.data
  for (let i = 0; i < alpha.length; i++) {
    const a = alpha[i] < opts.floor ? 0 : alpha[i]
    px[i * 4 + 3] = (px[i * 4 + 3] * a) / 255
  }
  ctx.putImageData(frame, 0, 0)

  if (opts.fill) {
    // Paint the background underneath the cut-out subject.
    ctx.globalCompositeOperation = 'destination-over'
    ctx.fillStyle = opts.fill
    ctx.fillRect(0, 0, width, height)
    ctx.globalCompositeOperation = 'source-over'
  }

  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'))
  if (!blob) throw new Error('Could not encode the PNG.')
  return blob
}

/** Grayscale preview of the raw matte, handy for judging edge quality. */
export async function renderMask(alpha: Uint8ClampedArray, width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  const frame = ctx.createImageData(width, height)
  for (let i = 0; i < alpha.length; i++) {
    const o = i * 4
    frame.data[o] = frame.data[o + 1] = frame.data[o + 2] = alpha[i]
    frame.data[o + 3] = 255
  }
  ctx.putImageData(frame, 0, 0)
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'))
  return blob!
}
