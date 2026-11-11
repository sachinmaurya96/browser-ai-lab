'use client'

/**
 * Interactive tool pages, keyed by slug. Each is its own chunk (with its worker
 * and model code) and is only fetched when its page is opened. `ssr: false`
 * because they use browser-only APIs (WebGPU, Web Audio, canvas, workers);
 * the server renders the SEO content around them instead.
 */
import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'
import { ToolLoading } from '../ui/ToolLoading'


export const TOOL_PAGES: Record<string, ComponentType> = {
  'bold-text-generator': dynamic(() => import('./social/StylePage'), { ssr: false, loading: ToolLoading }),
  'social-media-image-resizer': dynamic(() => import('./social/ImageSizePage'), { ssr: false, loading: ToolLoading }),
  'merge-pdf': dynamic(() => import('./pdf/MergePage'), { ssr: false, loading: ToolLoading }),
  'split-pdf': dynamic(() => import('./pdf/SplitPage'), { ssr: false, loading: ToolLoading }),
  'organize-pdf-pages': dynamic(() => import('./pdf/OrganizePage'), { ssr: false, loading: ToolLoading }),
  'compress-pdf': dynamic(() => import('./pdf/CompressPage'), { ssr: false, loading: ToolLoading }),
  'images-to-pdf': dynamic(() => import('./pdf/ImagesToPdfPage'), { ssr: false, loading: ToolLoading }),
  'pdf-to-images': dynamic(() => import('./pdf/PdfToImagesPage'), { ssr: false, loading: ToolLoading }),
  'pdf-to-text': dynamic(() => import('./pdf/PdfTextPage'), { ssr: false, loading: ToolLoading }),
  'watermark-pdf': dynamic(() => import('./pdf/StampPage'), { ssr: false, loading: ToolLoading }),
  'ask-pdf': dynamic(() => import('./pdf/AskPdfPage'), { ssr: false, loading: ToolLoading }),
  'ocr-scanned-pdf': dynamic(() => import('./pdf/PdfOcrPage'), { ssr: false, loading: ToolLoading }),
  'background-remover': dynamic(() => import('./cutout/CutoutPage'), { ssr: false, loading: ToolLoading }),
  'image-upscaler': dynamic(() => import('./upscale/UpscalePage'), { ssr: false, loading: ToolLoading }),
  'image-to-text': dynamic(() => import('./ocr/OcrPage'), { ssr: false, loading: ToolLoading }),
  'alt-text-generator': dynamic(() => import('./alt-text/AltTextPage'), { ssr: false, loading: ToolLoading }),
  'object-detection': dynamic(() => import('./objects/ObjectsPage'), { ssr: false, loading: ToolLoading }),
  'ai-photo-tagger': dynamic(() => import('./tagger/TaggerPage'), { ssr: false, loading: ToolLoading }),
  'depth-map-generator': dynamic(() => import('./depth/DepthPage'), { ssr: false, loading: ToolLoading }),
  'visual-question-answering': dynamic(() => import('./vision-chat/LookPage'), { ssr: false, loading: ToolLoading }),
  'speech-to-text': dynamic(() => import('./transcribe/TranscribePage'), { ssr: false, loading: ToolLoading }),
  'vocal-remover': dynamic(() => import('./music/MusicStudioPage'), { ssr: false, loading: ToolLoading }),
  'ai-sound-effects-generator': dynamic(() => import('./sfx/SfxPage'), { ssr: false, loading: ToolLoading }),
  'text-to-speech': dynamic(() => import('./kokoro/KokoroPage'), { ssr: false, loading: ToolLoading }),
  'sound-identifier': dynamic(() => import('./sounds/SoundsPage'), { ssr: false, loading: ToolLoading }),
  'ai-translator': dynamic(() => import('./translate/TranslatePage'), { ssr: false, loading: ToolLoading }),
  'text-summarizer': dynamic(() => import('./summarize/SummarizePage'), { ssr: false, loading: ToolLoading }),
  'document-question-answering': dynamic(() => import('./docqa/DocQaPage'), { ssr: false, loading: ToolLoading }),
  'emotion-detector': dynamic(() => import('./mood/MoodPage'), { ssr: false, loading: ToolLoading }),
  'pii-redactor': dynamic(() => import('./redact/RedactPage'), { ssr: false, loading: ToolLoading }),
  'private-ai-chat': dynamic(() => import('./chat/ChatPage'), { ssr: false, loading: ToolLoading }),
  'ai-rewriter': dynamic(() => import('./writer/WriterPage'), { ssr: false, loading: ToolLoading }),
  'ai-code-helper': dynamic(() => import('./code/CodePage'), { ssr: false, loading: ToolLoading }),
  'bug-report-to-ticket': dynamic(() => import('./ticket/TicketPage'), { ssr: false, loading: ToolLoading }),
  'semantic-search': dynamic(() => import('./search/SearchPage'), { ssr: false, loading: ToolLoading }),
  'duplicate-text-finder': dynamic(() => import('./dedupe/DedupePage'), { ssr: false, loading: ToolLoading }),
  'zero-shot-text-classifier': dynamic(() => import('./classify/ClassifyPage'), { ssr: false, loading: ToolLoading }),
  'toxicity-checker': dynamic(() => import('./moderate/ModeratePage'), { ssr: false, loading: ToolLoading }),
  'json-formatter': dynamic(() => import('./dev/JsonPage'), { ssr: false, loading: ToolLoading }),
  'jwt-decoder': dynamic(() => import('./dev/JwtPage'), { ssr: false, loading: ToolLoading }),
  'base64-url-encoder': dynamic(() => import('./dev/EncodePage'), { ssr: false, loading: ToolLoading }),
  'hash-generator': dynamic(() => import('./dev/HashPage'), { ssr: false, loading: ToolLoading }),
  'uuid-password-generator': dynamic(() => import('./dev/GeneratePage'), { ssr: false, loading: ToolLoading }),
  'regex-tester': dynamic(() => import('./dev/RegexPage'), { ssr: false, loading: ToolLoading }),
  'diff-checker': dynamic(() => import('./dev/DiffPage'), { ssr: false, loading: ToolLoading }),
  'unix-timestamp-converter': dynamic(() => import('./dev/TimePage'), { ssr: false, loading: ToolLoading }),
  'color-contrast-checker': dynamic(() => import('./dev/ColorPage'), { ssr: false, loading: ToolLoading }),
  'csv-to-json': dynamic(() => import('./dev/CsvPage'), { ssr: false, loading: ToolLoading }),
  'qr-code-generator': dynamic(() => import('./dev/QrPage'), { ssr: false, loading: ToolLoading }),
  'image-optimizer': dynamic(() => import('./dev/ImageOptimizePage'), { ssr: false, loading: ToolLoading }),
}
