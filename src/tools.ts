import {
  AlignLeft, AudioLines, Box, Camera, Code2, Copy, FileText, FolderTree, HeartPulse, Languages, Layers3, Maximize2,
  MessageCircleQuestion, Combine, SplitSquareHorizontal, LayoutGrid, FileImage, Images, FileType, Stamp, Minimize2, FileSearch, FileScan, Mic2, MessagesSquare, Mic, PenLine, ScanLine, ScanText, Scissors, ShieldAlert, ShieldCheck, Tags,
  Telescope, AudioWaveform, Music4, Type, Crop, Braces, KeyRound, Binary, Fingerprint, Dices, Regex, GitCompare, Clock, Palette, Sheet, QrCode, ImageDown, type LucideIcon,
} from 'lucide-react'

export type Category = 'Social' | 'PDF' | 'Image' | 'Audio' | 'Text' | 'Assistants' | 'Developer' | 'Dev Utilities'

export interface CategoryInfo {
  id: Category
  /** URL segment for /category/[slug]. */
  slug: string
  blurb: string
  /** Page title and H1 for the category page. */
  heading: string
  /** Meta description and intro for the category page. */
  description: string
}

export const CATEGORIES: CategoryInfo[] = [
  { id: 'Social', slug: 'social-media', blurb: 'Style text and size images for social media', heading: 'Free Social Media Tools', description: 'Format bold and italic text for LinkedIn and X, and resize one image to every social platform size at once. Runs in your browser, nothing is uploaded.' },
  { id: 'PDF', slug: 'pdf', blurb: 'Edit, convert and read PDFs, privately', heading: 'Free PDF Tools That Never Upload Your Files', description: 'Merge, split, compress, reorder, watermark and convert PDFs in your browser, plus AI tools to OCR scanned pages and answer questions about a document.' },
  { id: 'Image', slug: 'image', blurb: 'Edit, read and understand pictures', heading: 'Free AI Image Tools in Your Browser', description: 'Remove backgrounds, upscale images, extract text, write alt text, detect objects and create depth maps with AI models that run on your own device.' },
  { id: 'Audio', slug: 'audio', blurb: 'Speech, voices and sounds', heading: 'Free AI Audio Tools in Your Browser', description: 'Separate vocals and instruments, transcribe speech into subtitles, generate natural voices and sound effects, and identify sounds, all processed locally.' },
  { id: 'Text', slug: 'text', blurb: 'Translate, analyse and clean up text', heading: 'Free AI Text Tools That Run Offline', description: 'Translate between 200 languages, summarize articles, answer questions about a document, detect emotions and redact personal data without sending text to a server.' },
  { id: 'Assistants', slug: 'ai-assistants', blurb: 'Private generative AI', heading: 'Private AI Assistants in Your Browser', description: 'Chat with an offline AI assistant and rewrite text with small language models that run on your GPU. Your conversations never leave the tab.' },
  { id: 'Developer', slug: 'developer', blurb: 'AI tools for builders and support teams', heading: 'AI Tools for Developers and Support Teams', description: 'Explain and review code, turn bug reports into tickets, search and deduplicate text by meaning, classify messages and screen for toxicity, privately.' },
  { id: 'Dev Utilities', slug: 'dev-utilities', blurb: 'Instant everyday helpers, no model download', heading: 'Free Online Developer Utilities', description: 'Format JSON, decode JWTs, encode Base64, hash files, test regex, diff text, convert timestamps, check colour contrast and make QR codes, instantly and locally.' },
]

export const getTool = (slug: string) => TOOLS.find((t) => t.slug === slug)
export const getCategory = (slug: string) => CATEGORIES.find((c) => c.slug === slug)
export const categoryOf = (tool: Tool) => CATEGORIES.find((c) => c.id === tool.category)!

export interface Tool {
  slug: string
  name: string
  tagline: string
  blurb: string
  icon: LucideIcon
  category: Category
  stack: string[]
  /** Old HashRouter id (`/#/cutout`); see tools/slugs.ts. */
  legacy: string
}

// Display data only, safe to import from Server Components. The interactive
// pages are code-split in tools/loaders.tsx; SEO copy lives in content/tools.ts.
export const TOOLS: Tool[] = [
  // Social
  { slug: 'bold-text-generator', legacy: 'text-style', name: 'Text Styler', tagline: 'Bold & italic for posts', category: 'Social', icon: Type, stack: ['local'], blurb: 'Unicode bold, italic and more for LinkedIn and X headings.' },
  { slug: 'social-media-image-resizer', legacy: 'social-image', name: 'Social Image Sizer', tagline: 'Every platform size', category: 'Social', icon: Crop, stack: ['local'], blurb: 'Crop one image to LinkedIn, Instagram, X, YouTube and story sizes at once.' },

  // PDF
  { slug: 'merge-pdf', legacy: 'pdf-merge', name: 'Merge PDF', tagline: 'Combine files', category: 'PDF', icon: Combine, stack: ['pdf-lib'], blurb: 'Join several PDFs into one, in the order you choose.' },
  { slug: 'split-pdf', legacy: 'pdf-split', name: 'Split PDF', tagline: 'Extract pages', category: 'PDF', icon: SplitSquareHorizontal, stack: ['pdf-lib'], blurb: 'Pull out selected pages, or split into single pages or chunks.' },
  { slug: 'organize-pdf-pages', legacy: 'pdf-organize', name: 'Organize PDF', tagline: 'Reorder, rotate, delete', category: 'PDF', icon: LayoutGrid, stack: ['pdf-lib'], blurb: 'Rearrange, rotate and remove pages with visual thumbnails.' },
  { slug: 'compress-pdf', legacy: 'pdf-compress', name: 'Compress PDF', tagline: 'Shrink file size', category: 'PDF', icon: Minimize2, stack: ['pdf.js'], blurb: 'Make scanned and image-heavy PDFs small enough to email.' },
  { slug: 'images-to-pdf', legacy: 'pdf-images', name: 'Images → PDF', tagline: 'Photos to document', category: 'PDF', icon: FileImage, stack: ['pdf-lib'], blurb: 'Turn photos, scans and screenshots into a single PDF.' },
  { slug: 'pdf-to-images', legacy: 'pdf-to-images', name: 'PDF → Images', tagline: 'Export pages as PNG/JPG', category: 'PDF', icon: Images, stack: ['pdf.js'], blurb: 'Save every page, or just some, as high-resolution images.' },
  { slug: 'pdf-to-text', legacy: 'pdf-text', name: 'PDF → Text', tagline: 'Extract text', category: 'PDF', icon: FileType, stack: ['pdf.js'], blurb: 'Copy all the text out of a PDF, page by page.' },
  { slug: 'watermark-pdf', legacy: 'pdf-stamp', name: 'Watermark & Number', tagline: 'Stamp every page', category: 'PDF', icon: Stamp, stack: ['pdf-lib'], blurb: 'Add a diagonal watermark and page numbers to any PDF.' },
  { slug: 'ask-pdf', legacy: 'pdf-ask', name: 'Ask a PDF', tagline: 'AI document Q&A', category: 'PDF', icon: FileSearch, stack: ['DistilBERT'], blurb: 'Ask questions and get answers quoted from the PDF, with page numbers.' },
  { slug: 'ocr-scanned-pdf', legacy: 'pdf-ocr', name: 'Scan OCR', tagline: 'Read scanned PDFs', category: 'PDF', icon: FileScan, stack: ['Florence-2'], blurb: 'Use AI to read text from scanned or photographed PDF pages.' },

  // Image
  { slug: 'background-remover', legacy: 'cutout', name: 'Cutout', tagline: 'Background remover', category: 'Image', icon: Scissors, stack: ['RMBG-1.4'], blurb: 'Lift the subject out of any photo and export a transparent PNG.' },
  { slug: 'image-upscaler', legacy: 'upscale', name: 'Enhance', tagline: 'Image upscaler 2×', category: 'Image', icon: Maximize2, stack: ['Swin2SR'], blurb: 'Double the resolution of small or blurry images with AI detail.' },
  { slug: 'image-to-text', legacy: 'ocr', name: 'Text Scanner', tagline: 'Image to text (OCR)', category: 'Image', icon: ScanLine, stack: ['Florence-2'], blurb: 'Pull text out of screenshots, receipts, signs and scans.' },
  { slug: 'alt-text-generator', legacy: 'alt-text', name: 'Describe', tagline: 'Alt text writer', category: 'Image', icon: ScanText, stack: ['Florence-2'], blurb: 'Draft accessible alt text for an image at three levels of detail.' },
  { slug: 'object-detection', legacy: 'objects', name: 'Object Finder', tagline: 'Object detection', category: 'Image', icon: Box, stack: ['DETR'], blurb: 'Box and count people, cars, animals and 90 everyday objects.' },
  { slug: 'ai-photo-tagger', legacy: 'tagger', name: 'Photo Tagger', tagline: 'Custom image labels', category: 'Image', icon: Tags, stack: ['CLIP'], blurb: 'Sort photos into any categories you type, with no training needed.' },
  { slug: 'depth-map-generator', legacy: 'depth', name: 'Depth Map', tagline: '3D depth estimation', category: 'Image', icon: Layers3, stack: ['Depth Anything V2'], blurb: 'Estimate how far away everything in a photo is.' },
  { slug: 'visual-question-answering', legacy: 'look', name: 'Look & Ask', tagline: 'Webcam Q&A', category: 'Image', icon: Camera, stack: ['LFM2.5-VL'], blurb: 'Freeze a camera frame and ask a vision model questions about it.' },

  // Audio
  { slug: 'speech-to-text', legacy: 'transcribe', name: 'Transcribe', tagline: 'Speech to text + subtitles', category: 'Audio', icon: Mic, stack: ['Whisper'], blurb: 'Turn recordings and videos into text, or SRT/VTT subtitles, in 99 languages.' },
  { slug: 'vocal-remover', legacy: 'music-studio', name: 'AI Music Studio', tagline: 'Stems, trim & mix', category: 'Audio', icon: Music4, stack: ['Demucs v4'], blurb: 'Split songs into vocals, drums, bass, guitar, piano and more, then trim, remix and export.' },
  { slug: 'ai-sound-effects-generator', legacy: 'sfx', name: 'AI Sound Effects', tagline: 'Text → cartoon SFX', category: 'Audio', icon: AudioWaveform, stack: ['Stable Audio Open Small'], blurb: 'Generate cartoon sound effects and ambience from a text prompt, up to ~12 s of stereo audio.' },
  { slug: 'text-to-speech', legacy: 'voice-studio', name: 'Voice Studio', tagline: 'Natural AI voices (Kokoro)', category: 'Audio', icon: Mic2, stack: ['Kokoro-82M'], blurb: 'Lifelike speech in 50+ US and UK voices. Free for commercial use.' },
  { slug: 'sound-identifier', legacy: 'sounds', name: 'Sound ID', tagline: 'What is that sound?', category: 'Audio', icon: AudioLines, stack: ['AST'], blurb: 'Identify animals, instruments, alarms and 500+ other sounds.' },

  // Text
  { slug: 'ai-translator', legacy: 'translate', name: 'Translate', tagline: '200 languages', category: 'Text', icon: Languages, stack: ['NLLB-200'], blurb: 'Private translation between 200 languages, including Indian languages.' },
  { slug: 'text-summarizer', legacy: 'summarize', name: 'Summarize', tagline: 'TL;DR for long text', category: 'Text', icon: AlignLeft, stack: ['DistilBART'], blurb: 'Condense articles, reports and threads into the key points.' },
  { slug: 'document-question-answering', legacy: 'docqa', name: 'Ask a Doc', tagline: 'Document Q&A', category: 'Text', icon: MessageCircleQuestion, stack: ['DistilBERT'], blurb: 'Ask questions about a contract, manual or policy and get quoted answers.' },
  { slug: 'emotion-detector', legacy: 'mood', name: 'Emotion Radar', tagline: 'Sentiment & emotions', category: 'Text', icon: HeartPulse, stack: ['RoBERTa GoEmotions'], blurb: 'Detect 28 emotions across reviews, feedback and messages.' },
  { slug: 'pii-redactor', legacy: 'redact', name: 'Redactor', tagline: 'Remove personal data', category: 'Text', icon: ShieldCheck, stack: ['BERT NER'], blurb: 'Strip names, emails, phones, cards and IDs before sharing text.' },

  // Assistants
  { slug: 'private-ai-chat', legacy: 'chat', name: 'Private Chat', tagline: 'Offline AI assistant', category: 'Assistants', icon: MessagesSquare, stack: ['Llama 3.2 1B'], blurb: 'A ChatGPT-style assistant that never sends your words anywhere.' },
  { slug: 'ai-rewriter', legacy: 'writer', name: 'Rewriter', tagline: 'Grammar, tone & replies', category: 'Assistants', icon: PenLine, stack: ['Qwen2.5-0.5B'], blurb: 'Fix grammar, change tone, shorten text or draft a reply.' },

  // Developer
  { slug: 'ai-code-helper', legacy: 'code', name: 'Code Helper', tagline: 'Explain, review, convert', category: 'Developer', icon: Code2, stack: ['Qwen2.5-Coder'], blurb: 'Explain code, find bugs, write regex, SQL, tests and commit messages.' },
  { slug: 'bug-report-to-ticket', legacy: 'ticket', name: 'Triage', tagline: 'Complaint → ticket', category: 'Developer', icon: FileText, stack: ['Qwen2.5-0.5B'], blurb: 'Turn a rambling bug report into a clean, structured issue ticket.' },
  { slug: 'semantic-search', legacy: 'search', name: 'Recall', tagline: 'Semantic search', category: 'Developer', icon: Telescope, stack: ['MiniLM-L6'], blurb: 'Find tickets by meaning, and compare against keyword search.' },
  { slug: 'duplicate-text-finder', legacy: 'dedupe', name: 'Duplicate Finder', tagline: 'Group similar items', category: 'Developer', icon: Copy, stack: ['MiniLM-L6'], blurb: 'Cluster near-duplicate tickets, feedback or keywords by meaning.' },
  { slug: 'zero-shot-text-classifier', legacy: 'classify', name: 'Smart Sorter', tagline: 'Zero-shot classifier', category: 'Developer', icon: FolderTree, stack: ['MobileBERT MNLI'], blurb: 'Route emails, tickets or notes into categories you define.' },
  { slug: 'toxicity-checker', legacy: 'moderate', name: 'Moderator', tagline: 'Toxicity checker', category: 'Developer', icon: ShieldAlert, stack: ['Toxic-BERT'], blurb: 'Screen comments and chats for insults, threats and hate.' },
  // Dev Utilities (no model, instant)
  { slug: 'json-formatter', legacy: 'json', name: 'JSON Studio', tagline: 'Format, validate, TS types', category: 'Dev Utilities', icon: Braces, stack: ['local'], blurb: 'Pretty-print, minify and validate JSON, and generate TypeScript interfaces.' },
  { slug: 'jwt-decoder', legacy: 'jwt', name: 'JWT Decoder', tagline: 'Inspect tokens', category: 'Dev Utilities', icon: KeyRound, stack: ['local'], blurb: 'Decode JWT headers and claims and check expiry, without sending tokens anywhere.' },
  { slug: 'base64-url-encoder', legacy: 'encode', name: 'Encoder', tagline: 'Base64, URL, HTML, hex', category: 'Dev Utilities', icon: Binary, stack: ['local'], blurb: 'Encode and decode Base64, Base64URL, URL, HTML entities, hex and Unicode.' },
  { slug: 'hash-generator', legacy: 'hash', name: 'Hash Generator', tagline: 'SHA & HMAC checksums', category: 'Dev Utilities', icon: Fingerprint, stack: ['Web Crypto'], blurb: 'SHA-1/256/384/512 and HMAC for text or files, with checksum comparison.' },
  { slug: 'uuid-password-generator', legacy: 'generate', name: 'Generators', tagline: 'UUIDs, passwords, keys', category: 'Dev Utilities', icon: Dices, stack: ['Web Crypto'], blurb: 'Cryptographically secure UUID v4/v7, passwords, hex tokens and API keys.' },
  { slug: 'regex-tester', legacy: 'regex', name: 'Regex Tester', tagline: 'Live matches & groups', category: 'Dev Utilities', icon: Regex, stack: ['local'], blurb: 'Test JavaScript regular expressions with highlighting, groups and replace.' },
  { slug: 'diff-checker', legacy: 'diff', name: 'Diff Checker', tagline: 'Compare text & code', category: 'Dev Utilities', icon: GitCompare, stack: ['local'], blurb: 'Line-by-line diff of two texts, with a copyable patch.' },
  { slug: 'unix-timestamp-converter', legacy: 'time', name: 'Time & Cron', tagline: 'Timestamps, cron explainer', category: 'Dev Utilities', icon: Clock, stack: ['local'], blurb: 'Convert Unix timestamps and dates, and see what a cron expression really means.' },
  { slug: 'color-contrast-checker', legacy: 'color', name: 'Color Tools', tagline: 'Convert & contrast check', category: 'Dev Utilities', icon: Palette, stack: ['local'], blurb: 'HEX/RGB/HSL conversion, shade scales and WCAG contrast checks.' },
  { slug: 'csv-to-json', legacy: 'csv', name: 'CSV ⇄ JSON', tagline: 'Convert data', category: 'Dev Utilities', icon: Sheet, stack: ['local'], blurb: 'Convert CSV/TSV to JSON and back, with type detection and nested flattening.' },
  { slug: 'qr-code-generator', legacy: 'qr', name: 'QR Generator', tagline: 'URL, Wi-Fi, UPI codes', category: 'Dev Utilities', icon: QrCode, stack: ['local'], blurb: 'Make QR codes for links, Wi-Fi logins, UPI payments, email and phone numbers.' },
  { slug: 'image-optimizer', legacy: 'img-optimize', name: 'Image Optimizer', tagline: 'Resize & convert to WebP', category: 'Dev Utilities', icon: ImageDown, stack: ['local'], blurb: 'Batch resize and compress images to WebP, JPG or PNG, and strip metadata.' },
]
