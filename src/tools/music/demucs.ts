/**
 * Hybrid Transformer Demucs (v4) pre/post-processing.
 *
 * The ONNX exports in RabiatS/audio-playground-models contain only the neural
 * network. Everything around it is reproduced here from facebookresearch/demucs:
 *
 *   track → (x − mean) / std                    separate.py
 *   7.8 s segments, 25 % overlap, triangle fade  apply.py  (apply_model, split=True)
 *   segment → STFT, complex-as-channels          htdemucs.py (_spec, _magnitude)
 *   net(mix, mag) → spec, wave                   ONNX graph
 *   stem = iSTFT(spec) + wave                    htdemucs.py (_mask, _ispec)
 *
 * The STFT matches `torch.stft(n_fft=4096, hop=1024, hann, normalized=True,
 * center=True, pad_mode='reflect')` after Demucs' own extra reflect padding.
 * No imports, so the same file runs in the worker and in Node tests.
 */

/** Shape of the `<model>.json` file published next to each graph. */
export interface DemucsConfig {
  name: string
  sources: string[]
  samplerate: number
  segment_samples: number
  frames: number
  nfft: number
  hop: number
}

/** Runs the network on one segment: mix [2, L] and mag [4, F, T] in, spec [S, 4, F, T] and wave [S, 2, L] out. */
export type RunSegment = (mix: Float32Array, mag: Float32Array) => Promise<{ spec: Float32Array; wave: Float32Array }>

/** In-place iterative radix-2 complex FFT (unnormalised in both directions). */
class Fft {
  private n: number
  private rev: Uint32Array
  private cos: Float64Array
  private sin: Float64Array

  constructor(n: number) {
    this.n = n
    const bits = Math.log2(n)
    if (!Number.isInteger(bits)) throw new Error('FFT size must be a power of two')
    this.rev = new Uint32Array(n)
    for (let i = 0; i < n; i++) {
      let r = 0
      for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b)
      this.rev[i] = r
    }
    this.cos = new Float64Array(n / 2)
    this.sin = new Float64Array(n / 2)
    for (let i = 0; i < n / 2; i++) {
      this.cos[i] = Math.cos((2 * Math.PI * i) / n)
      this.sin[i] = Math.sin((2 * Math.PI * i) / n)
    }
  }

  transform(re: Float64Array, im: Float64Array, inverse: boolean) {
    const { n, rev, cos, sin } = this
    const sign = inverse ? 1 : -1
    for (let i = 0; i < n; i++) {
      const j = rev[i]
      if (j > i) {
        let t = re[i]; re[i] = re[j]; re[j] = t
        t = im[i]; im[i] = im[j]; im[j] = t
      }
    }
    for (let size = 2; size <= n; size <<= 1) {
      const half = size >> 1
      const step = n / size
      for (let start = 0; start < n; start += size) {
        for (let k = 0, w = 0; k < half; k++, w += step) {
          const wr = cos[w]
          const wi = sign * sin[w]
          const a = start + k
          const b = a + half
          const xr = re[b] * wr - im[b] * wi
          const xi = re[b] * wi + im[b] * wr
          re[b] = re[a] - xr
          im[b] = im[a] - xi
          re[a] += xr
          im[a] += xi
        }
      }
    }
  }
}

/** numpy/torch 'reflect' padding (edge sample not repeated). */
function reflectPad(x: Float32Array, left: number, right: number): Float32Array {
  const n = x.length
  if (left >= n || right >= n) throw new Error('Segment too short for reflect padding')
  const out = new Float32Array(n + left + right)
  for (let i = 0; i < left; i++) out[i] = x[left - i]
  out.set(x, left)
  for (let j = 0; j < right; j++) out[left + n + j] = x[n - 2 - j]
  return out
}

/**
 * Demucs' stereo STFT. Both channels go through one complex FFT (L + iR) and
 * are split apart using the conjugate symmetry of real signals.
 */
export class DemucsStft {
  readonly nfft: number
  readonly hop: number
  readonly bins: number
  private fft: Fft
  private win: Float64Array
  private re: Float64Array
  private im: Float64Array
  private envFrames = -1
  private env = new Float64Array(0)

  constructor(nfft: number, hop: number) {
    this.nfft = nfft
    this.hop = hop
    if (hop * 4 !== nfft) throw new Error('Demucs expects hop = nfft / 4')
    this.bins = nfft / 2 // Demucs drops the Nyquist bin
    this.fft = new Fft(nfft)
    this.win = new Float64Array(nfft)
    for (let i = 0; i < nfft; i++) this.win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / nfft) // periodic Hann
    this.re = new Float64Array(nfft)
    this.im = new Float64Array(nfft)
  }

  frames(length: number) {
    return Math.ceil(length / this.hop)
  }

  /** HTDemucs._spec + _magnitude: writes [Lre, Lim, Rre, Rim] × bins × frames into `out`. */
  forward(left: Float32Array, right: Float32Array, out: Float32Array) {
    const { nfft: N, hop, bins: F, win, re, im } = this
    const length = left.length
    const T = this.frames(length)
    const pad = (hop / 2) * 3
    const pl = reflectPad(reflectPad(left, pad, pad + T * hop - length), N / 2, N / 2)
    const pr = reflectPad(reflectPad(right, pad, pad + T * hop - length), N / 2, N / 2)
    const FT = F * T
    const scale = 0.5 / Math.sqrt(N) // ½ from the channel split, 1/√N from normalized=True
    for (let t = 0; t < T; t++) {
      const s = (t + 2) * hop // torch gives T + 4 frames; Demucs keeps 2 … T + 1
      for (let i = 0; i < N; i++) {
        re[i] = pl[s + i] * win[i]
        im[i] = pr[s + i] * win[i]
      }
      this.fft.transform(re, im, false)
      for (let f = 0; f < F; f++) {
        const g = f === 0 ? 0 : N - f
        const k = f * T + t
        out[k] = (re[f] + re[g]) * scale
        out[FT + k] = (im[f] - im[g]) * scale
        out[2 * FT + k] = (im[f] + im[g]) * scale
        out[3 * FT + k] = (re[g] - re[f]) * scale
      }
    }
  }

  /**
   * HTDemucs._ispec for one source: `spec` holds [Lre, Lim, Rre, Rim] × bins ×
   * frames starting at `base`. Writes `outL.length` samples per channel.
   */
  inverse(spec: Float32Array, base: number, frames: number, outL: Float32Array, outR: Float32Array) {
    const { nfft: N, hop, bins: F, win, re, im } = this
    const T = frames
    const FT = F * T
    const pad = (hop / 2) * 3
    const total = N + hop * (T + 3)
    const yl = new Float64Array(total)
    const yr = new Float64Array(total)
    const scale = 1 / Math.sqrt(N) // ×√N from normalized=True, ×1/N for the inverse DFT
    for (let t = 0; t < T; t++) {
      re.fill(0)
      im.fill(0)
      for (let f = 0; f < F; f++) {
        const k = base + f * T + t
        const lr = spec[k], li = spec[FT + k], rr = spec[2 * FT + k], ri = spec[3 * FT + k]
        if (f === 0) {
          // irfft ignores the imaginary part of the DC bin
          re[0] = lr
          im[0] = rr
          continue
        }
        // Z = XL + i·XR, with both spectra extended Hermitian-symmetrically
        re[f] = lr - ri
        im[f] = li + rr
        re[N - f] = lr + ri
        im[N - f] = rr - li
      }
      this.fft.transform(re, im, true)
      const s = (t + 2) * hop
      for (let i = 0; i < N; i++) {
        const w = win[i] * scale
        yl[s + i] += re[i] * w
        yr[s + i] += im[i] * w
      }
    }
    const env = this.envelope(T)
    const off = N / 2 + pad // istft's center trim, then Demucs' own pad
    for (let i = 0; i < outL.length; i++) {
      const e = env[off + i]
      outL[i] = e > 1e-11 ? yl[off + i] / e : 0
      outR[i] = e > 1e-11 ? yr[off + i] / e : 0
    }
  }

  /** Σ window² over all T + 4 frames, including the two zero frames on each side. */
  private envelope(T: number) {
    if (this.envFrames === T) return this.env
    const { nfft: N, hop, win } = this
    const env = new Float64Array(N + hop * (T + 3))
    for (let t = 0; t < T + 4; t++) for (let i = 0; i < N; i++) env[t * hop + i] += win[i] * win[i]
    this.env = env
    this.envFrames = T
    return env
  }
}

export interface SeparateOptions {
  /** Called after each segment with (done, total). */
  onSegment?(done: number, total: number): void
  /** Checked between segments; returning true aborts with a 'Cancelled' error. */
  cancelled?(): boolean
  /** Segment overlap, as in apply_model (default 0.25). */
  overlap?: number
}

export class CancelledError extends Error {
  constructor() {
    super('Separation cancelled')
    this.name = 'CancelledError'
  }
}

/**
 * Separate a stereo track at the model's sample rate. Returns one [left, right]
 * pair per entry in `cfg.sources`, the same length as the input.
 */
export async function separate(cfg: DemucsConfig, left: Float32Array, right: Float32Array, run: RunSegment, opts: SeparateOptions = {}): Promise<[Float32Array, Float32Array][]> {
  const n = left.length
  const S = cfg.sources.length
  const L = cfg.segment_samples
  const stft = new DemucsStft(cfg.nfft, cfg.hop)
  const F = stft.bins
  const T = stft.frames(L)
  if (T !== cfg.frames) throw new Error(`Model config mismatch: expected ${cfg.frames} frames, STFT gives ${T}`)

  // Whole-track normalisation on the mono reference (unbiased std, like torch).
  let mean = 0
  for (let i = 0; i < n; i++) mean += (left[i] + right[i]) / 2
  mean /= Math.max(1, n)
  let v = 0
  for (let i = 0; i < n; i++) {
    const d = (left[i] + right[i]) / 2 - mean
    v += d * d
  }
  const std = Math.sqrt(v / Math.max(1, n - 1))
  if (!(std > 1e-8)) throw new Error('The audio is silent, so there is nothing to separate.')

  // Triangle weights: arange(1, L/2 + 1) ++ arange(L − L/2, 0, −1), scaled to peak 1.
  const half = L >> 1
  const weight = new Float32Array(L)
  for (let k = 0; k < half; k++) weight[k] = (k + 1) / half
  for (let k = half; k < L; k++) weight[k] = (L - k) / half

  const out = Array.from({ length: S }, () => [new Float32Array(n), new Float32Array(n)] as [Float32Array, Float32Array])
  const sumW = new Float32Array(n)
  const stride = Math.floor((1 - (opts.overlap ?? 0.25)) * L)
  const offsets: number[] = []
  for (let o = 0; o < n; o += stride) offsets.push(o)

  const mix = new Float32Array(2 * L)
  const mixL = mix.subarray(0, L)
  const mixR = mix.subarray(L)
  const mag = new Float32Array(4 * F * T)
  const al = new Float32Array(L)
  const ar = new Float32Array(L)

  opts.onSegment?.(0, offsets.length)
  for (let c = 0; c < offsets.length; c++) {
    if (opts.cancelled?.()) throw new CancelledError()
    const offset = offsets[c]
    // TensorChunk.padded: centre the chunk in a full segment, using real
    // neighbouring audio where it exists and zeros past the track edges.
    const chunk = Math.min(L, n - offset)
    const trim = (L - chunk) >> 1
    const start = offset - trim
    mix.fill(0)
    for (let k = 0; k < L; k++) {
      const i = start + k
      if (i >= 0 && i < n) {
        mixL[k] = (left[i] - mean) / std
        mixR[k] = (right[i] - mean) / std
      }
    }
    stft.forward(mixL, mixR, mag)
    const { spec, wave } = await run(mix, mag)

    for (let s = 0; s < S; s++) {
      stft.inverse(spec, s * 4 * F * T, T, al, ar)
      const wl = 2 * s * L
      const wr = wl + L
      const [ol, or] = out[s]
      for (let k = 0; k < chunk; k++) {
        const w = weight[k]
        ol[offset + k] += w * (al[trim + k] + wave[wl + trim + k])
        or[offset + k] += w * (ar[trim + k] + wave[wr + trim + k])
      }
    }
    for (let k = 0; k < chunk; k++) sumW[offset + k] += weight[k]
    opts.onSegment?.(c + 1, offsets.length)
  }

  for (const [ol, or] of out) {
    for (let i = 0; i < n; i++) {
      ol[i] = (ol[i] / sumW[i]) * std + mean
      or[i] = (or[i] / sumW[i]) * std + mean
    }
  }
  return out
}
