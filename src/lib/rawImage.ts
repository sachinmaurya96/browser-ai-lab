/** Image data as returned (cloned) from the pipeline worker. */
export interface PlainImage {
  width: number
  height: number
  channels: number
  data: Uint8Array | Uint8ClampedArray
}

/** Draw worker image data (1, 3 or 4 channels) into a canvas. */
export function imageToCanvas(img: PlainImage, colorize?: (v: number) => [number, number, number]): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')!
  const frame = ctx.createImageData(img.width, img.height)
  const n = img.width * img.height
  for (let i = 0; i < n; i++) {
    const o = i * 4
    if (img.channels === 1) {
      const v = img.data[i]
      const [r, g, b] = colorize ? colorize(v) : [v, v, v]
      frame.data[o] = r
      frame.data[o + 1] = g
      frame.data[o + 2] = b
    } else {
      frame.data[o] = img.data[i * img.channels]
      frame.data[o + 1] = img.data[i * img.channels + 1]
      frame.data[o + 2] = img.data[i * img.channels + 2]
    }
    frame.data[o + 3] = img.channels === 4 ? img.data[i * 4 + 3] : 255
  }
  ctx.putImageData(frame, 0, 0)
  return canvas
}

export const canvasBlob = (c: HTMLCanvasElement, type = 'image/png') =>
  new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Encoding failed'))), type))
