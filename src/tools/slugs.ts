/**
 * Old route → new route for every tool.
 *
 * The Vite build used a HashRouter (`/#/cutout`), so the old IDs only ever
 * existed in URL fragments. Servers never see fragments: these are handled by
 * a tiny client-side script in the root layout, and also as real redirects for
 * `/cutout` and `/tools/cutout` in next.config.ts in case anyone links to those.
 *
 * Kept free of React/icon imports so next.config.ts can import it.
 */
export const LEGACY_SLUGS: Record<string, string> = {
  'text-style': 'bold-text-generator',
  'social-image': 'social-media-image-resizer',
  'pdf-merge': 'merge-pdf',
  'pdf-split': 'split-pdf',
  'pdf-organize': 'organize-pdf-pages',
  'pdf-compress': 'compress-pdf',
  'pdf-images': 'images-to-pdf',
  'pdf-to-images': 'pdf-to-images',
  'pdf-text': 'pdf-to-text',
  'pdf-stamp': 'watermark-pdf',
  'pdf-ask': 'ask-pdf',
  'pdf-ocr': 'ocr-scanned-pdf',
  cutout: 'background-remover',
  upscale: 'image-upscaler',
  ocr: 'image-to-text',
  'alt-text': 'alt-text-generator',
  objects: 'object-detection',
  tagger: 'ai-photo-tagger',
  depth: 'depth-map-generator',
  look: 'visual-question-answering',
  transcribe: 'speech-to-text',
  'music-studio': 'vocal-remover',
  sfx: 'ai-sound-effects-generator',
  'voice-studio': 'text-to-speech',
  sounds: 'sound-identifier',
  translate: 'ai-translator',
  summarize: 'text-summarizer',
  docqa: 'document-question-answering',
  mood: 'emotion-detector',
  redact: 'pii-redactor',
  chat: 'private-ai-chat',
  writer: 'ai-rewriter',
  code: 'ai-code-helper',
  ticket: 'bug-report-to-ticket',
  search: 'semantic-search',
  dedupe: 'duplicate-text-finder',
  classify: 'zero-shot-text-classifier',
  moderate: 'toxicity-checker',
  json: 'json-formatter',
  jwt: 'jwt-decoder',
  encode: 'base64-url-encoder',
  hash: 'hash-generator',
  generate: 'uuid-password-generator',
  regex: 'regex-tester',
  diff: 'diff-checker',
  time: 'unix-timestamp-converter',
  color: 'color-contrast-checker',
  csv: 'csv-to-json',
  qr: 'qr-code-generator',
  'img-optimize': 'image-optimizer',
}

export const toolPath = (slug: string) => `/tools/${slug}`
