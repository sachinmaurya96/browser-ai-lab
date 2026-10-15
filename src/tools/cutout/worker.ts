/// <reference lib="webworker" />
import { AutoModel, AutoProcessor, RawImage } from '@huggingface/transformers'
import { serve } from '../../lib/engine'

export const MODEL = 'briaai/RMBG-1.4'

// The library's model/processor types are very loose; treat them as opaque.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loaded = { net: any; prep: any }

export interface MatteInput {
  url: string
  width: number
  height: number
}

serve<Loaded>({
  async boot({ gpu, progress }) {
    const device = gpu.webgpu ? 'webgpu' : 'wasm'
    // RMBG ships fp32 ONNX weights, which behave on both backends.
    const net = await AutoModel.from_pretrained(MODEL, { device, dtype: 'fp32', progress_callback: progress })
    const prep = await AutoProcessor.from_pretrained(MODEL, { progress_callback: progress })
    return { model: { net, prep }, device }
  },

  ops: {
    /** Predict a 0–255 foreground matte at the image's own resolution. */
    async matte({ net, prep }, input: MatteInput, ctx) {
      const image = await RawImage.fromURL(input.url)
      const { pixel_values } = await prep(image)
      const { output } = await net({ input: pixel_values })
      const mask = await RawImage.fromTensor(output[0].mul(255).to('uint8')).resize(input.width, input.height)
      const alpha = new Uint8ClampedArray(mask.data)
      ctx.transfer.push(alpha.buffer)
      return alpha
    },
  },
})
