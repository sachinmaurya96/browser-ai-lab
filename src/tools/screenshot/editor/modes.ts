/**
 * Editor modes: Screenshot, Code, Post and App Store set. Each mode keeps its
 * own design while you switch; this file holds their labels and the scene a
 * mode starts from.
 */
import {
  type CodeContent,
  type Scene,
  SAMPLE_CODE,
  applyStylePatch,
  createScene,
  getCodeStyle,
  getPostStyle,
  samplePost,
  sampleQuote,
  DEFAULT_QUOTE_STYLE,
} from "../engine";
import type { IconName } from "../icons";

export type Mode = "screenshot" | "code" | "post" | "quote" | "appstore";

export const MODES: { id: Mode; label: string; short: string; icon: IconName; blurb: string }[] = [
  {
    id: "screenshot",
    label: "Screenshot",
    short: "Shot",
    icon: "screenshot",
    blurb: "Frame a screenshot on a styled background",
  },
  {
    id: "code",
    label: "Code",
    short: "Code",
    icon: "code",
    blurb: "Paste code, get a beautiful image",
  },
  {
    id: "post",
    label: "Post",
    short: "Post",
    icon: "message",
    blurb: "Social posts and testimonials as cards",
  },
  {
    id: "quote",
    label: "Quote",
    short: "Quote",
    icon: "quote",
    blurb: "Famous quotes with their authors, cleanly set",
  },
  {
    id: "appstore",
    label: "App Store",
    short: "Store",
    icon: "phones",
    blurb: "A set of App Store screenshots in one go",
  },
];

export function modeForScene(scene: Scene): Mode {
  if (scene.content.kind === "code") return "code";
  if (scene.content.kind === "post") return scene.content.variant === "quote" ? "quote" : "post";
  return "screenshot";
}

export const DEFAULT_CODE_STYLE = "code-midnight-candy";

export function initialCodeContent(): CodeContent {
  return {
    kind: "code",
    code: SAMPLE_CODE,
    language: "auto",
    theme: "midnight-candy",
    fontSize: 15,
    lineNumbers: true,
    highlight: [],
    title: "polish.ts",
    chrome: "mac",
    padding: 28,
    tokens: null,
  };
}

export function initialCodeScene(): Scene {
  const style = getCodeStyle(DEFAULT_CODE_STYLE)!;
  const s = createScene({ content: initialCodeContent(), meta: { name: "code" } });
  return applyStylePatch(s, style.patch, style.id);
}

export const DEFAULT_POST_STYLE = "post-sherbet";

/** Today as a post date, e.g. "Nov 14" (editable on the card). */
export function todayLabel(now = new Date()): string {
  return now.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function initialPostScene(): Scene {
  const style = getPostStyle(DEFAULT_POST_STYLE)!;
  const s = createScene({
    content: { ...samplePost("social", todayLabel()), theme: style.theme, accent: style.accent },
    meta: { name: "post" },
  });
  return applyStylePatch(s, style.patch, style.id);
}

export function initialQuoteScene(): Scene {
  const style = getPostStyle(DEFAULT_QUOTE_STYLE)!;
  const s = createScene({
    content: { ...sampleQuote(0), theme: style.theme, accent: style.accent, quoteStyle: style.quoteStyle },
    meta: { name: "quote" },
  });
  return applyStylePatch(s, style.patch, style.id);
}
