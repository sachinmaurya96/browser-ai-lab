import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import {
  AlignLeft, AudioLines, Box, Camera, Code2, Copy, FileText, FolderTree, HeartPulse, Languages, Layers3, Maximize2,
  MessageCircleQuestion, Combine, SplitSquareHorizontal, LayoutGrid, FileImage, Images, FileType, Stamp, Minimize2, FileSearch, FileScan, Mic2, MessagesSquare, Mic, PenLine, ScanLine, ScanText, Scissors, ShieldAlert, ShieldCheck, Tags,
  Telescope, Type, Crop, Braces, KeyRound, Binary, Fingerprint, Dices, Regex, GitCompare, Clock, Palette, Sheet, QrCode, ImageDown, type LucideIcon,
} from 'lucide-react'

export type Category = 'Social' | 'PDF' | 'Image' | 'Audio' | 'Text' | 'Assistants' | 'Developer' | 'Dev Utilities'

export const CATEGORIES: { id: Category; blurb: string }[] = [
  { id: 'Social', blurb: 'Style text and size images for social media' },
  { id: 'PDF', blurb: 'Edit, convert and read PDFs, privately' },
  { id: 'Image', blurb: 'Edit, read and understand pictures' },
  { id: 'Audio', blurb: 'Speech, voices and sounds' },
  { id: 'Text', blurb: 'Translate, analyse and clean up text' },
  { id: 'Assistants', blurb: 'Private generative AI' },
  { id: 'Developer', blurb: 'AI tools for builders and support teams' },
  { id: 'Dev Utilities', blurb: 'Instant everyday helpers, no model download' },
]

export interface Tool {
  slug: string
  name: string
  tagline: string
  blurb: string
  icon: LucideIcon
  category: Category
  stack: string[]
  page: LazyExoticComponent<ComponentType>
}

// Every page (and its worker + model) is code-split and only fetched when its
// route is opened.
export const TOOLS: Tool[] = [
  // Social
  { slug: 'text-style', name: 'Text Styler', tagline: 'Bold & italic for posts', category: 'Social', icon: Type, stack: ['local'], blurb: 'Unicode bold, italic and more for LinkedIn and X headings.', page: lazy(() => import('./tools/social/StylePage')) },
  { slug: 'social-image', name: 'Social Image Sizer', tagline: 'Every platform size', category: 'Social', icon: Crop, stack: ['local'], blurb: 'Crop one image to LinkedIn, Instagram, X, YouTube and story sizes at once.', page: lazy(() => import('./tools/social/ImageSizePage')) },

  // PDF
  { slug: 'pdf-merge', name: 'Merge PDF', tagline: 'Combine files', category: 'PDF', icon: Combine, stack: ['pdf-lib'], blurb: 'Join several PDFs into one, in the order you choose.', page: lazy(() => import('./tools/pdf/MergePage')) },
  { slug: 'pdf-split', name: 'Split PDF', tagline: 'Extract pages', category: 'PDF', icon: SplitSquareHorizontal, stack: ['pdf-lib'], blurb: 'Pull out selected pages, or split into single pages or chunks.', page: lazy(() => import('./tools/pdf/SplitPage')) },
  { slug: 'pdf-organize', name: 'Organize PDF', tagline: 'Reorder, rotate, delete', category: 'PDF', icon: LayoutGrid, stack: ['pdf-lib'], blurb: 'Rearrange, rotate and remove pages with visual thumbnails.', page: lazy(() => import('./tools/pdf/OrganizePage')) },
  { slug: 'pdf-compress', name: 'Compress PDF', tagline: 'Shrink file size', category: 'PDF', icon: Minimize2, stack: ['pdf.js'], blurb: 'Make scanned and image-heavy PDFs small enough to email.', page: lazy(() => import('./tools/pdf/CompressPage')) },
  { slug: 'pdf-images', name: 'Images → PDF', tagline: 'Photos to document', category: 'PDF', icon: FileImage, stack: ['pdf-lib'], blurb: 'Turn photos, scans and screenshots into a single PDF.', page: lazy(() => import('./tools/pdf/ImagesToPdfPage')) },
  { slug: 'pdf-to-images', name: 'PDF → Images', tagline: 'Export pages as PNG/JPG', category: 'PDF', icon: Images, stack: ['pdf.js'], blurb: 'Save every page, or just some, as high-resolution images.', page: lazy(() => import('./tools/pdf/PdfToImagesPage')) },
  { slug: 'pdf-text', name: 'PDF → Text', tagline: 'Extract text', category: 'PDF', icon: FileType, stack: ['pdf.js'], blurb: 'Copy all the text out of a PDF, page by page.', page: lazy(() => import('./tools/pdf/PdfTextPage')) },
  { slug: 'pdf-stamp', name: 'Watermark & Number', tagline: 'Stamp every page', category: 'PDF', icon: Stamp, stack: ['pdf-lib'], blurb: 'Add a diagonal watermark and page numbers to any PDF.', page: lazy(() => import('./tools/pdf/StampPage')) },
  { slug: 'pdf-ask', name: 'Ask a PDF', tagline: 'AI document Q&A', category: 'PDF', icon: FileSearch, stack: ['DistilBERT'], blurb: 'Ask questions and get answers quoted from the PDF, with page numbers.', page: lazy(() => import('./tools/pdf/AskPdfPage')) },
  { slug: 'pdf-ocr', name: 'Scan OCR', tagline: 'Read scanned PDFs', category: 'PDF', icon: FileScan, stack: ['Florence-2'], blurb: 'Use AI to read text from scanned or photographed PDF pages.', page: lazy(() => import('./tools/pdf/PdfOcrPage')) },

  // Image
  { slug: 'cutout', name: 'Cutout', tagline: 'Background remover', category: 'Image', icon: Scissors, stack: ['RMBG-1.4'], blurb: 'Lift the subject out of any photo and export a transparent PNG.', page: lazy(() => import('./tools/cutout/CutoutPage')) },
  { slug: 'upscale', name: 'Enhance', tagline: 'Image upscaler 2×', category: 'Image', icon: Maximize2, stack: ['Swin2SR'], blurb: 'Double the resolution of small or blurry images with AI detail.', page: lazy(() => import('./tools/upscale/UpscalePage')) },
  { slug: 'ocr', name: 'Text Scanner', tagline: 'Image to text (OCR)', category: 'Image', icon: ScanLine, stack: ['Florence-2'], blurb: 'Pull text out of screenshots, receipts, signs and scans.', page: lazy(() => import('./tools/ocr/OcrPage')) },
  { slug: 'alt-text', name: 'Describe', tagline: 'Alt text writer', category: 'Image', icon: ScanText, stack: ['Florence-2'], blurb: 'Draft accessible alt text for an image at three levels of detail.', page: lazy(() => import('./tools/alt-text/AltTextPage')) },
  { slug: 'objects', name: 'Object Finder', tagline: 'Object detection', category: 'Image', icon: Box, stack: ['DETR'], blurb: 'Box and count people, cars, animals and 90 everyday objects.', page: lazy(() => import('./tools/objects/ObjectsPage')) },
  { slug: 'tagger', name: 'Photo Tagger', tagline: 'Custom image labels', category: 'Image', icon: Tags, stack: ['CLIP'], blurb: 'Sort photos into any categories you type, with no training needed.', page: lazy(() => import('./tools/tagger/TaggerPage')) },
  { slug: 'depth', name: 'Depth Map', tagline: '3D depth estimation', category: 'Image', icon: Layers3, stack: ['Depth Anything V2'], blurb: 'Estimate how far away everything in a photo is.', page: lazy(() => import('./tools/depth/DepthPage')) },
  { slug: 'look', name: 'Look & Ask', tagline: 'Webcam Q&A', category: 'Image', icon: Camera, stack: ['LFM2.5-VL'], blurb: 'Freeze a camera frame and ask a vision model questions about it.', page: lazy(() => import('./tools/vision-chat/LookPage')) },

  // Audio
  { slug: 'transcribe', name: 'Transcribe', tagline: 'Speech to text + subtitles', category: 'Audio', icon: Mic, stack: ['Whisper'], blurb: 'Turn recordings and videos into text, or SRT/VTT subtitles, in 99 languages.', page: lazy(() => import('./tools/transcribe/TranscribePage')) },
  { slug: 'voice-studio', name: 'Voice Studio', tagline: 'Natural AI voices (Kokoro)', category: 'Audio', icon: Mic2, stack: ['Kokoro-82M'], blurb: 'Lifelike speech in 50+ US and UK voices. Free for commercial use.', page: lazy(() => import('./tools/kokoro/KokoroPage')) },
  { slug: 'sounds', name: 'Sound ID', tagline: 'What is that sound?', category: 'Audio', icon: AudioLines, stack: ['AST'], blurb: 'Identify animals, instruments, alarms and 500+ other sounds.', page: lazy(() => import('./tools/sounds/SoundsPage')) },

  // Text
  { slug: 'translate', name: 'Translate', tagline: '200 languages', category: 'Text', icon: Languages, stack: ['NLLB-200'], blurb: 'Private translation between 200 languages, including Indian languages.', page: lazy(() => import('./tools/translate/TranslatePage')) },
  { slug: 'summarize', name: 'Summarize', tagline: 'TL;DR for long text', category: 'Text', icon: AlignLeft, stack: ['DistilBART'], blurb: 'Condense articles, reports and threads into the key points.', page: lazy(() => import('./tools/summarize/SummarizePage')) },
  { slug: 'docqa', name: 'Ask a Doc', tagline: 'Document Q&A', category: 'Text', icon: MessageCircleQuestion, stack: ['DistilBERT'], blurb: 'Ask questions about a contract, manual or policy and get quoted answers.', page: lazy(() => import('./tools/docqa/DocQaPage')) },
  { slug: 'mood', name: 'Emotion Radar', tagline: 'Sentiment & emotions', category: 'Text', icon: HeartPulse, stack: ['RoBERTa GoEmotions'], blurb: 'Detect 28 emotions across reviews, feedback and messages.', page: lazy(() => import('./tools/mood/MoodPage')) },
  { slug: 'redact', name: 'Redactor', tagline: 'Remove personal data', category: 'Text', icon: ShieldCheck, stack: ['BERT NER'], blurb: 'Strip names, emails, phones, cards and IDs before sharing text.', page: lazy(() => import('./tools/redact/RedactPage')) },

  // Assistants
  { slug: 'chat', name: 'Private Chat', tagline: 'Offline AI assistant', category: 'Assistants', icon: MessagesSquare, stack: ['Llama 3.2 1B'], blurb: 'A ChatGPT-style assistant that never sends your words anywhere.', page: lazy(() => import('./tools/chat/ChatPage')) },
  { slug: 'writer', name: 'Rewriter', tagline: 'Grammar, tone & replies', category: 'Assistants', icon: PenLine, stack: ['Qwen2.5-0.5B'], blurb: 'Fix grammar, change tone, shorten text or draft a reply.', page: lazy(() => import('./tools/writer/WriterPage')) },

  // Developer
  { slug: 'code', name: 'Code Helper', tagline: 'Explain, review, convert', category: 'Developer', icon: Code2, stack: ['Qwen2.5-Coder'], blurb: 'Explain code, find bugs, write regex, SQL, tests and commit messages.', page: lazy(() => import('./tools/code/CodePage')) },
  { slug: 'ticket', name: 'Triage', tagline: 'Complaint → ticket', category: 'Developer', icon: FileText, stack: ['Qwen2.5-0.5B'], blurb: 'Turn a rambling bug report into a clean, structured issue ticket.', page: lazy(() => import('./tools/ticket/TicketPage')) },
  { slug: 'search', name: 'Recall', tagline: 'Semantic search', category: 'Developer', icon: Telescope, stack: ['MiniLM-L6'], blurb: 'Find tickets by meaning, and compare against keyword search.', page: lazy(() => import('./tools/search/SearchPage')) },
  { slug: 'dedupe', name: 'Duplicate Finder', tagline: 'Group similar items', category: 'Developer', icon: Copy, stack: ['MiniLM-L6'], blurb: 'Cluster near-duplicate tickets, feedback or keywords by meaning.', page: lazy(() => import('./tools/dedupe/DedupePage')) },
  { slug: 'classify', name: 'Smart Sorter', tagline: 'Zero-shot classifier', category: 'Developer', icon: FolderTree, stack: ['MobileBERT MNLI'], blurb: 'Route emails, tickets or notes into categories you define.', page: lazy(() => import('./tools/classify/ClassifyPage')) },
  { slug: 'moderate', name: 'Moderator', tagline: 'Toxicity checker', category: 'Developer', icon: ShieldAlert, stack: ['Toxic-BERT'], blurb: 'Screen comments and chats for insults, threats and hate.', page: lazy(() => import('./tools/moderate/ModeratePage')) },
  // Dev Utilities (no model, instant)
  { slug: 'json', name: 'JSON Studio', tagline: 'Format, validate, TS types', category: 'Dev Utilities', icon: Braces, stack: ['local'], blurb: 'Pretty-print, minify and validate JSON, and generate TypeScript interfaces.', page: lazy(() => import('./tools/dev/JsonPage')) },
  { slug: 'jwt', name: 'JWT Decoder', tagline: 'Inspect tokens', category: 'Dev Utilities', icon: KeyRound, stack: ['local'], blurb: 'Decode JWT headers and claims and check expiry, without sending tokens anywhere.', page: lazy(() => import('./tools/dev/JwtPage')) },
  { slug: 'encode', name: 'Encoder', tagline: 'Base64, URL, HTML, hex', category: 'Dev Utilities', icon: Binary, stack: ['local'], blurb: 'Encode and decode Base64, Base64URL, URL, HTML entities, hex and Unicode.', page: lazy(() => import('./tools/dev/EncodePage')) },
  { slug: 'hash', name: 'Hash Generator', tagline: 'SHA & HMAC checksums', category: 'Dev Utilities', icon: Fingerprint, stack: ['Web Crypto'], blurb: 'SHA-1/256/384/512 and HMAC for text or files, with checksum comparison.', page: lazy(() => import('./tools/dev/HashPage')) },
  { slug: 'generate', name: 'Generators', tagline: 'UUIDs, passwords, keys', category: 'Dev Utilities', icon: Dices, stack: ['Web Crypto'], blurb: 'Cryptographically secure UUID v4/v7, passwords, hex tokens and API keys.', page: lazy(() => import('./tools/dev/GeneratePage')) },
  { slug: 'regex', name: 'Regex Tester', tagline: 'Live matches & groups', category: 'Dev Utilities', icon: Regex, stack: ['local'], blurb: 'Test JavaScript regular expressions with highlighting, groups and replace.', page: lazy(() => import('./tools/dev/RegexPage')) },
  { slug: 'diff', name: 'Diff Checker', tagline: 'Compare text & code', category: 'Dev Utilities', icon: GitCompare, stack: ['local'], blurb: 'Line-by-line diff of two texts, with a copyable patch.', page: lazy(() => import('./tools/dev/DiffPage')) },
  { slug: 'time', name: 'Time & Cron', tagline: 'Timestamps, cron explainer', category: 'Dev Utilities', icon: Clock, stack: ['local'], blurb: 'Convert Unix timestamps and dates, and see what a cron expression really means.', page: lazy(() => import('./tools/dev/TimePage')) },
  { slug: 'color', name: 'Color Tools', tagline: 'Convert & contrast check', category: 'Dev Utilities', icon: Palette, stack: ['local'], blurb: 'HEX/RGB/HSL conversion, shade scales and WCAG contrast checks.', page: lazy(() => import('./tools/dev/ColorPage')) },
  { slug: 'csv', name: 'CSV ⇄ JSON', tagline: 'Convert data', category: 'Dev Utilities', icon: Sheet, stack: ['local'], blurb: 'Convert CSV/TSV to JSON and back, with type detection and nested flattening.', page: lazy(() => import('./tools/dev/CsvPage')) },
  { slug: 'qr', name: 'QR Generator', tagline: 'URL, Wi-Fi, UPI codes', category: 'Dev Utilities', icon: QrCode, stack: ['local'], blurb: 'Make QR codes for links, Wi-Fi logins, UPI payments, email and phone numbers.', page: lazy(() => import('./tools/dev/QrPage')) },
  { slug: 'img-optimize', name: 'Image Optimizer', tagline: 'Resize & convert to WebP', category: 'Dev Utilities', icon: ImageDown, stack: ['local'], blurb: 'Batch resize and compress images to WebP, JPG or PNG, and strip metadata.', page: lazy(() => import('./tools/dev/ImageOptimizePage')) },
]
