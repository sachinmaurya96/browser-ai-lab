/**
 * Turn a raw model caption into alt-text-shaped prose. Screen readers already
 * announce "image", so lead-ins like "The image shows" are pure noise.
 */
const LEAD_IN =
  /^(?:in\s+this\s+(?:image|picture|photo)[, ]+|(?:this|the|an?)\s+(?:image|picture|photo(?:graph)?)\s+(?:shows|depicts|features|contains|of)\s+|(?:an?\s+)?(?:image|picture|photo(?:graph)?)\s+(?:of|showing)\s+|there\s+(?:is|are)\s+)/i

export function polishCaption(raw: string): string {
  let text = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  // Strip at most two stacked lead-ins ("In this image, there is …").
  for (let i = 0; i < 2; i++) text = text.replace(LEAD_IN, '')
  text = text.replace(/[\s.]+$/, '')
  if (!text) return ''
  return text[0].toUpperCase() + text.slice(1) + '.'
}

/** Append the author's context note as its own sentence, unless already covered. */
export function withContext(caption: string, note: string): string {
  const extra = note.trim().replace(/^[\s,;:.-]+|[\s.]+$/g, '')
  if (!caption || !extra) return caption
  if (caption.toLowerCase().includes(extra.toLowerCase())) return caption
  return `${caption} ${extra[0].toUpperCase()}${extra.slice(1)}.`
}

export const RECOMMENDED_MAX = 125

export const length = (s: string) => [...s].length

export function htmlSnippet(alt: string, filename: string): string {
  const safe = alt.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
  return `<img src="${filename}" alt="${safe}" />`
}
