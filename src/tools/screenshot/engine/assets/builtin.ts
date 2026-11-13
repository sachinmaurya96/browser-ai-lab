/**
 * Built-in assets (the wallpaper library) are referenced from scenes as
 * `builtin:<name>`. They ship with the app (public/backgrounds/<name>.webp),
 * so project files do not embed them and storage never garbage-collects them.
 */
export const BUILTIN_PREFIX = "builtin:";

export function isBuiltinAssetId(id: string): boolean {
  return id.startsWith(BUILTIN_PREFIX);
}

/** Where the studio's static files are served (public/screenshot-studio). */
export const BUILTIN_BASE = "/screenshot-studio/";

/** Fetch a built-in asset's file (same-origin static file; no third-party request). */
export async function fetchBuiltinAsset(id: string, base = BUILTIN_BASE): Promise<Blob> {
  const res = await fetch(builtinAssetUrl(id, base));
  if (!res.ok) throw new Error(`Built-in asset ${id} not found (${res.status})`);
  return res.blob();
}

/** URL of a built-in asset (`base` defaults to where the studio's files are served). */
export function builtinAssetUrl(id: string, base = BUILTIN_BASE): string {
  const name = id.slice(BUILTIN_PREFIX.length).replace(/[^a-z0-9-]/gi, "");
  return `${base.endsWith("/") ? base : `${base}/`}backgrounds/${name}.webp`;
}
