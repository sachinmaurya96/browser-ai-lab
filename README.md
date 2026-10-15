# Browser AI Lab

35 free AI tools that run entirely in your browser. No backend, no API keys, no sign-up, and no uploads. Models download once from the Hugging Face Hub, get cached, and run locally via [Transformers.js](https://huggingface.co/docs/transformers.js) on WebGPU, falling back to WebAssembly.

| Category | Tools |
|---|---|
| **PDF** | Merge · Split · Organize (reorder/rotate/delete) · Compress · Images → PDF · PDF → Images · PDF → Text · Watermark & page numbers · Ask a PDF (AI Q&A) · Scan OCR (AI, Florence-2) |
| **Image** | Cutout (background remover, RMBG-1.4) · Enhance (2× upscaler, Swin2SR) · Text Scanner (OCR, Florence-2) · Describe (alt text, Florence-2) · Object Finder (DETR) · Photo Tagger (CLIP zero-shot) · Depth Map (Depth Anything V2) · Look & Ask (webcam VQA, LFM2.5-VL) |
| **Audio** | Voice Studio (Kokoro-82M, 50+ voices, Apache-2.0) · Transcribe (Whisper, SRT/VTT export) · Sound ID (AST AudioSet) |
| **Text** | Translate (NLLB-200) · Summarize (DistilBART) · Ask a Doc (extractive QA) · Emotion Radar (GoEmotions) · Redactor (BERT NER + patterns) |
| **Assistants** | Private Chat (Qwen2.5-1.5B) · Rewriter (Qwen2.5-0.5B) |
| **Developer** | Code Helper (Qwen2.5-Coder) · Triage (complaint → ticket) · Recall (semantic vs BM25 search) · Duplicate Finder (MiniLM) · Smart Sorter (zero-shot) · Moderator (Toxic-BERT) |

## Run it

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # type-check + production build into dist/
npm run preview   # serve the build
```

Chrome or Edge with WebGPU gives the best speed. Other browsers run on the CPU and are slower. The camera needs `localhost` or HTTPS.

## How it's put together

```
src/
  lib/
    protocol.ts   message types shared by UI and workers
    engine.ts     worker runtime: lazy boot, run queue, progress, stop
    useModel.ts   React hook that owns one model worker
    images.ts     EXIF-aware decode/resize, download helpers
  ui/             shell (sidebar layout, theme), kit, ModelCard, DropZone, home
  tools/<tool>/   worker.ts (model) + page + tool-specific logic
  lib/pipeline.worker.ts  generic worker hosting any Transformers.js pipeline
  lib/llm.worker.ts       generic streaming chat worker
  ui/LlmTool.tsx          shared layout for mode-based LLM tools
  tools.ts        registry: categories, nav, routes, code-splitting
```

Each tool's worker declares an `Engine` with a `boot()` function and named `ops`. The UI calls `model.run(op, input, onEmit)` and gets back a promise, with streamed tokens or progress arriving through `onEmit`. Runs queue inside the worker, so the UI never sends overlapping requests. Every tool page is lazy-loaded, so a model is only fetched when you open its tool.

Routing uses `HashRouter` with a relative Vite `base`, so `dist/` works from any static host or sub-path without rewrite rules.

## Deploy

`.github/workflows/deploy.yml` builds and publishes to GitHub Pages on every push to `main`. To use it, enable Pages with the source set to **GitHub Actions** in the repo settings.

## Caveats

- AI output is a draft. Review alt text, tickets and VQA answers before relying on them.
- RMBG-1.4 is licensed for non-commercial use only. For commercial use, swap in a permissively licensed segmentation model in `tools/cutout/worker.ts`.
- First loads range from about 23 MB (Recall) to around 1 GB (Look & Ask, depending on precision).
# browser-ai-lab
