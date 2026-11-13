# Browser AI Lab

50 free tools that run entirely in your browser: AI for images, audio, text and PDFs, plus instant developer and social-media utilities. There is no inference backend, no API keys and no sign-up, and nothing is uploaded. Models download once from the Hugging Face Hub, are cached, and run locally on WebGPU, falling back to WebAssembly.

Live at **https://www.browserailab.com**. Built with Next.js (App Router) and deployed on Vercel.

| Category | Tools |
|---|---|
| **Social** | Bold/italic text styler · Social image resizer |
| **PDF** | Merge · Split · Organize · Compress · Images → PDF · PDF → Images · PDF → Text · Watermark & page numbers · Ask a PDF (AI Q&A) · Scan OCR (Florence-2) |
| **Image** | Background remover (RMBG-1.4) · 2× upscaler (Swin2SR) · Image to text (Florence-2) · Alt text (Florence-2) · Object detection (DETR) · Photo tagger (CLIP) · Depth map (Depth Anything V2) · Look & Ask (LFM2.5-VL) · Screenshot Studio: beautifier, mockups, 3D devices, AI cut-out, code images, quote cards, App Store sets ([details](src/tools/screenshot/README.md)) |
| **Audio** | Vocal remover & stem splitter (Demucs v4) · Speech to text + subtitles (Whisper) · AI sound effects (Stable Audio Open Small) · Text to speech (Kokoro-82M, Hindi Piper) · Sound identifier (AST) |
| **Text** | Translator (NLLB-200) · Summarizer (DistilBART) · Document Q&A · Emotion detector (GoEmotions) · PII redactor (BERT NER) |
| **Assistants** | Private chat (Llama 3.2 1B) · Rewriter (Qwen2.5-0.5B) |
| **Developer** | Code helper (Qwen2.5-Coder) · Bug report → ticket · Semantic search · Duplicate finder · Zero-shot classifier · Toxicity checker |
| **Dev Utilities** | JSON · JWT · Encoder · Hash · UUID/password · Regex · Diff · Timestamp & cron · Colour/contrast · CSV ⇄ JSON · QR codes · Image optimizer |

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build (type-checks, prerenders every page)
npm start          # serve the production build
npm run typecheck  # tsc only
```

Copy `.env.example` to `.env.local` to override settings locally. Chrome or Edge with WebGPU gives the best speed; other browsers run on the CPU. The camera and microphone need `localhost` or HTTPS.

## How it's put together

```
src/
  app/                    Next.js routes (Server Components unless marked 'use client')
    page.tsx              home
    tools/page.tsx        all-tools directory
    tools/[slug]/         one prerendered page per tool + its OG image
    category/[slug]/      one page per category
    guides/               editorial guides (Article JSON-LD)
    about|contact|privacy|terms/
    sitemap.ts robots.ts manifest.ts opengraph-image.tsx not-found.tsx error.tsx
  tools.ts                registry: slugs, names, categories, icons (server-safe)
  tools/slugs.ts          old HashRouter id → new slug (redirects)
  tools/loaders.tsx       client-only map of slug → lazily loaded interactive tool
  tools/<tool>/           each tool's page component, worker and logic
  content/tools.ts        per-tool SEO copy: title, description, H1, how-to, features, FAQs, related
  content/guides.tsx      guides
  seo/                    metadata helper, JSON-LD builders, OG image renderer
  site.ts                 domain, author, env-driven flags
  lib/                    worker runtime (engine.ts, useModel.ts), shared workers, helpers
  ui/                     shell, kit, shared components
```

**Rendering.** Every public page is statically prerendered. A tool page's heading, intro, how-to, features, formats, FAQs, related links and JSON-LD are server-rendered HTML. The interactive tool is a client island (`ToolApp`) loaded with `next/dynamic` and `ssr: false`, because tools depend on WebGPU, Web Audio, canvas and workers. Its code, worker and model are only fetched when that page is opened.

**Workers.** Each tool's worker declares an `Engine` (`boot()` plus named `ops`) and calls `serve()`. The UI calls `model.run(op, input, onEmit)`. Runs queue inside the worker, so the UI never sends overlapping requests. Workers are created with `new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })`, which Turbopack bundles.

## Adding a tool

1. Build the page component in `src/tools/<tool>/`.
2. Add an entry to `TOOLS` in `src/tools.ts` (slug, name, category…).
3. Map the slug to the component in `src/tools/loaders.tsx`.
4. Write its copy in `src/content/tools.ts`. Keep every claim true to what the tool does.

Routes, the sitemap, OG images, category pages and nav pick it up automatically.

## Deploy

Vercel builds it with zero configuration. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for environment variables, the custom-domain cut-over, redirects and Search Console setup.

## Caveats

- AI output is a draft. Review transcripts, translations, alt text and tickets before relying on them.
- Some models are licensed for non-commercial use only (RMBG-1.4, NLLB-200, the Hindi Piper voices); each tool page says which.
- First loads range from about 23 MB (semantic search) to about 2 GB (sound effects).
