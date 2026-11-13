/**
 * Background library (data from the design team: presets/data/backgrounds.json).
 * Image backgrounds reference built-in wallpapers as `builtin:<name>` assets.
 */
import type { BackgroundFill, GrainSpec } from "../scene/types";
import data from "./data/backgrounds.json";

export type BackgroundGroup = "auto" | "solid" | "gradient" | "mesh" | "image";

export interface BackgroundPreset {
  id: string;
  label: string;
  group: BackgroundGroup;
  tone: string;
  fill: BackgroundFill;
  grain: GrainSpec;
  /** Wallpapers only: the collection it is listed under ("Silk", "Paper"…). */
  collection?: string;
}

export const BACKGROUND_GROUPS: readonly { id: BackgroundGroup; label: string }[] = data.groups as {
  id: BackgroundGroup;
  label: string;
}[];

export const BACKGROUND_PRESETS: readonly BackgroundPreset[] = data.backgrounds.map((b) => ({
  id: b.id,
  label: b.name,
  group: b.group as BackgroundGroup,
  tone: b.tone,
  fill: b.fill as BackgroundFill,
  grain: b.grain,
  ...("collection" in b && typeof b.collection === "string" ? { collection: b.collection } : {}),
}));

/** Wallpapers by collection, in library order. */
export function wallpaperCollections(): { name: string; items: BackgroundPreset[] }[] {
  const out: { name: string; items: BackgroundPreset[] }[] = [];
  for (const w of BACKGROUND_PRESETS) {
    if (w.group !== "image") continue;
    const name = w.collection ?? "Wallpapers";
    let c = out.find((x) => x.name === name);
    if (!c) out.push((c = { name, items: [] }));
    c.items.push(w);
  }
  return out;
}

const byId = new Map(BACKGROUND_PRESETS.map((b) => [b.id, b]));

export function getBackgroundPreset(id: string): BackgroundPreset | undefined {
  return byId.get(id);
}

const inGroup = (...groups: BackgroundGroup[]) =>
  BACKGROUND_PRESETS.filter((b) => groups.includes(b.group));

export const GRADIENT_PRESETS = inGroup("gradient");
export const MESH_PRESETS = inGroup("mesh");
export const WALLPAPER_PRESETS = inGroup("image");
export const SOLID_PRESETS: readonly string[] = inGroup("solid").map((b) =>
  b.fill.kind === "solid" ? b.fill.color : "#ffffff",
);
