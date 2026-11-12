import Link from 'next/link'
import type { ReactNode } from 'react'
import { ACTIVE_TOOLS } from '../tools/slugs'

/**
 * Editorial guides. Each one exists because it answers a real question the
 * tools solve; don't add keyword-variation pages. Keep instructions in sync
 * with the tool they describe.
 */
export interface Guide {
  slug: string
  title: string
  description: string
  /** ISO dates. Update `modified` whenever the content changes. */
  published: string
  modified: string
  /** Tools this guide walks through; linked at the end. */
  tools: string[]
  body: ReactNode
}

/** Link to a tool, or plain text if that tool has been retired from the catalog. */
const T = ({ to, children }: { to: string; children: ReactNode }) =>
  ACTIVE_TOOLS.has(to) ? <Link href={`/tools/${to}`} className="font-medium text-accent underline underline-offset-4">{children}</Link> : <>{children}</>

export const GUIDES: Guide[] = [
  {
    slug: 'remove-vocals-from-a-song',
    title: 'How to Remove Vocals From a Song for Free (No Upload)',
    description: 'Make a karaoke instrumental or an a cappella from any song in your browser with Demucs AI: separate the stems, mute the vocals and export WAV or MP3.',
    published: '2026-11-11',
    modified: '2026-11-11',
    tools: ['vocal-remover', 'speech-to-text'],
    body: (
      <>
        <p>
          Most online vocal removers upload your song to a server and make you wait in a queue. The{' '}
          <T to="vocal-remover">AI Music Studio</T> does the whole job in your browser instead, using Meta&apos;s open-source
          Hybrid Transformer Demucs model. The song never leaves your computer, and the result is a set of separate tracks
          (stems) that you can mix however you like.
        </p>

        <h2>What you need</h2>
        <ul>
          <li>A desktop browser. Chrome or Edge with WebGPU is fastest; other browsers fall back to the CPU, which is slower but works.</li>
          <li>The song as an audio file: MP3, WAV, FLAC, OGG, M4A or a video with a soundtrack.</li>
          <li>A one-time model download of 86 MB (4 stems) or 57 MB (6 stems). It is cached, so later separations start immediately.</li>
        </ul>

        <h2>Step 1: Load and (optionally) trim the song</h2>
        <p>
          Drop the file onto the studio. Its waveform appears in the cutter, where you can play it, drag to select a region and
          use <strong>Trim to selection</strong> to keep only the part you need. Trimming first is worthwhile for long tracks:
          separation is limited to 8 minutes with the 4-stem model and 6 minutes with the 6-stem model, to stay within browser memory.
        </p>

        <h2>Step 2: Choose a model and separate</h2>
        <p>
          Pick <strong>4 stems</strong> (vocals, drums, bass, other) for the cleanest vocals, or <strong>6 stems</strong> if you
          also want guitar and piano on their own tracks. The 6-stem model&apos;s piano stem is noticeably weaker, so prefer 4 stems
          when you only care about vocals. Click <strong>Separate</strong>. A progress bar shows each 7.8-second segment as it is
          processed, and you can cancel at any time.
        </p>

        <h2>Step 3: Make the instrumental or the a cappella</h2>
        <p>
          When separation finishes, every stem appears as its own track in the mixer. Press the round play button on a track to
          hear that stem alone. Then use the presets:
        </p>
        <ul>
          <li><strong>Instrumental (no vocals)</strong> mutes the vocal track for a karaoke version.</li>
          <li><strong>Vocals only (a cappella)</strong> keeps just the voice.</li>
          <li><strong>No drums</strong> or <strong>No bass</strong> are handy for practising along with a band.</li>
        </ul>
        <p>You can also mute, solo or rebalance any track with its own volume slider. All tracks stay locked in sync.</p>

        <h2>Step 4: Export</h2>
        <p>
          Choose WAV (16- or 24-bit) or MP3, then <strong>Download mix</strong> to save exactly what you hear. Download icons on each
          track save individual stems, and <strong>All stems (.zip)</strong> saves them together. If boosting stems would
          clip, the export is turned down as a whole so it never distorts.
        </p>

        <h2>Getting the best results</h2>
        <ul>
          <li>Start from the highest-quality file you have; separation can&apos;t recover detail that compression removed.</li>
          <li>Expect some bleed. Reverb on the vocal and instruments that share its frequency range are the hardest cases for any separator.</li>
          <li>Need the lyrics too? Export the vocals-only mix and run it through <T to="speech-to-text">Speech to Text</T>.</li>
        </ul>
        <p>Only use songs you have the right to edit, and check the copyright before sharing remixes.</p>
      </>
    ),
  },
  {
    slug: 'make-subtitles-from-a-video',
    title: 'How to Make SRT or VTT Subtitles From a Video for Free',
    description: 'Create timestamped SRT or VTT subtitles from a video or recording with Whisper AI running in your browser, then translate them to English if needed.',
    published: '2026-11-11',
    modified: '2026-11-11',
    tools: ['speech-to-text', 'ai-translator'],
    body: (
      <>
        <p>
          Subtitles make videos accessible and searchable, but transcription services usually charge by the minute and require
          an upload. <T to="speech-to-text">Speech to Text</T> runs OpenAI&apos;s Whisper model in your browser and writes standard
          subtitle files you can add to YouTube, video editors or a web player.
        </p>

        <h2>Step 1: Add the audio</h2>
        <p>
          Choose a video or audio file (MP4, WebM, MP3, WAV, M4A, OGG and others your browser can play), or record from your
          microphone. Video files are fine: only the soundtrack is used.
        </p>

        <h2>Step 2: Choose the output language</h2>
        <p>
          Keep <strong>Same language</strong> to transcribe what is spoken, or choose <strong>English</strong> to have Whisper
          translate speech in other languages into English subtitles.
        </p>

        <h2>Step 3: Transcribe and download</h2>
        <p>
          The first run downloads the model (about 200 MB), which is then cached. When transcription finishes, download:
        </p>
        <ul>
          <li><strong>SRT</strong> for YouTube and most video editors.</li>
          <li><strong>VTT</strong> for HTML5 video players (the <code>&lt;track&gt;</code> element).</li>
          <li><strong>TXT</strong> for a plain transcript.</li>
        </ul>

        <h2>Tips for accurate subtitles</h2>
        <ul>
          <li>Clear speech with little background music transcribes best. For music videos, remove the backing track first with the <T to="vocal-remover">vocal remover</T> and transcribe the vocals-only mix.</li>
          <li>Whisper base is a compact model: always skim names, numbers and technical terms before publishing.</li>
          <li>Need subtitles in a language other than English? Translate the TXT with the <T to="ai-translator">AI translator</T>, then copy the lines back into the subtitle file.</li>
        </ul>
      </>
    ),
  },
  {
    slug: 'how-browser-ai-works',
    title: 'How Browser AI Lab Runs AI Models on Your Device',
    description: 'What happens when you use an AI tool in Browser AI Lab: model downloads and caching, WebGPU and WebAssembly, Web Workers, and why your files stay private.',
    published: '2026-11-11',
    modified: '2026-11-12',
    tools: ['background-remover', 'speech-to-text'],
    body: (
      <>
        <p>
          Browser AI Lab has no AI server. When you remove a background, transcribe a recording or translate a document, the
          neural network runs inside your browser tab on your own hardware. Here is what that means in practice.
        </p>

        <h2>1. The model is downloaded once, then cached</h2>
        <p>
          Each AI tool uses an open model published on Hugging Face, from about 55 MB (the image enhancer) to about 650 MB
          (the translator). The first time you use a tool, its model files are downloaded and stored in your
          browser&apos;s cache storage. Later visits load them from disk, and most tools then work offline.
        </p>

        <h2>2. WebGPU runs it on your graphics card</h2>
        <p>
          Models run with ONNX Runtime Web and Transformers.js. In browsers that support WebGPU (recent Chrome and Edge, for
          example), the heavy maths runs on your GPU, which is often many times faster than the CPU. Where WebGPU isn&apos;t
          available, or where a GPU would give wrong results, tools fall back to WebAssembly on the CPU. That is slower but works
          almost everywhere.
        </p>

        <h2>3. Web Workers keep the page responsive</h2>
        <p>
          Inference happens in a background Web Worker, separate from the page you interact with. That is why you can keep
          scrolling, cancel long jobs, or play audio while a model is busy.
        </p>

        <h2>4. Your data stays in the tab</h2>
        <p>
          Files you open are read directly by the browser and processed in memory. They are not uploaded, because there is
          nowhere to upload them to. The only network requests a tool makes are for its code and model files.
        </p>

        <h2>Trade-offs to know about</h2>
        <ul>
          <li><strong>First-run download.</strong> Large models take time to fetch on slow connections.</li>
          <li><strong>Device limits.</strong> Big models need free memory; phones and older laptops may be slow or unable to run the largest ones.</li>
          <li><strong>Smaller models.</strong> On-device models are compact, so a tool like the <T to="text-summarizer">Summarizer</T> is less capable than large cloud AI services. In return it is free, private and works offline.</li>
        </ul>
        <p>
          Want to check for yourself? Open your browser&apos;s network panel and use the{' '}
          <T to="background-remover">background remover</T>: you&apos;ll see model files being fetched, but never your photo.
        </p>
      </>
    ),
  },
]

export const getGuide = (slug: string) => GUIDES.find((g) => g.slug === slug)
