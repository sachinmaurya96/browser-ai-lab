"use client";
/**
 * Background remover inside the studio: the Background Remover tool's
 * RMBG-1.4 worker and matte, run on every screen of the design. Each cut-out
 * is a new transparent PNG asset that replaces its screen's image in one undo
 * step (crop and annotations stay, the pixel size is unchanged); the original
 * is remembered so it can be put back.
 *
 * The worker starts on first use, so nothing is downloaded until the user asks.
 */
import { renderCutout } from "../../cutout/matte";
import type { MatteInput } from "../../cutout/worker";
import type { FromWorker, ToWorker } from "../../../lib/protocol";
import { type Scene, screenContent, setIn, shownScreens } from "../engine";
import { createStore, type Store } from "../lib/store";
import type { EditorApp } from "./app";

export interface CutoutUi {
  phase: "idle" | "loading" | "working" | "error";
  /** Model download, 0..1, while it is downloading (null when unknown). */
  download: number | null;
  done: number;
  total: number;
  error: string | null;
  /** Hide the card's frame, rectangular shadow, border and plate so the subject floats. */
  float: boolean;
  /** Bake a soft shadow that follows the subject's outline into the cut-out. */
  shadow: boolean;
}

/** Matte values below this are treated as background (cleans faint halos). */
const ALPHA_FLOOR = 10;

export class CutoutController {
  readonly ui: Store<CutoutUi> = createStore<CutoutUi>({
    phase: "idle",
    download: null,
    done: 0,
    total: 0,
    error: null,
    float: true,
    shadow: true,
  });
  /** Cut-out asset id -> the image it was made from. */
  private readonly originals = new Map<string, string>();
  private worker: Worker | null = null;
  private seq = 0;
  private readonly waiters = new Map<
    number,
    { resolve: (v: Uint8ClampedArray) => void; reject: (e: Error) => void }
  >();
  private readonly files = new Map<string, { loaded: number; total: number }>();

  constructor(private readonly app: EditorApp) {}

  /** Screens on the stage holding an image that hasn't been cut out yet. */
  pending(scene: Scene = this.app.scene): { index: number; assetId: string }[] {
    if (scene.content.kind !== "image") return [];
    const out: { index: number; assetId: string }[] = [];
    for (let i = 0; i < shownScreens(scene); i++) {
      const id = screenContent(scene, i)?.assetId;
      if (id && !this.originals.has(id) && this.app.library.entry(id) && !this.app.library.entry(id)?.video)
        out.push({ index: i, assetId: id });
    }
    return out;
  }

  /** Cut-outs made here that are on the stage now. */
  cutouts(scene: Scene = this.app.scene): string[] {
    if (scene.content.kind !== "image") return [];
    const out: string[] = [];
    for (let i = 0; i < shownScreens(scene); i++) {
      const id = screenContent(scene, i)?.assetId;
      if (id && this.originals.has(id)) out.push(id);
    }
    return out;
  }

  async remove(): Promise<void> {
    const ui = this.ui.get();
    if (ui.phase === "loading" || ui.phase === "working") return;
    const targets = this.pending();
    if (!targets.length) return;
    this.ui.set({ phase: "working", done: 0, total: targets.length, error: null });
    const made = new Map<string, string>();
    try {
      for (const t of targets) {
        if (made.has(t.assetId)) continue;
        const entry = this.app.library.entry(t.assetId);
        if (!entry) continue;
        const file = await this.cut(entry.blob, entry.width, entry.height, ui.shadow);
        const { added } = await this.app.batch.importImages([file]);
        const id = added[0]?.id;
        if (id && id !== t.assetId) {
          made.set(t.assetId, id);
          this.originals.set(id, t.assetId);
        }
        this.ui.set((s) => ({ done: s.done + 1 }));
      }
    } catch (e) {
      this.ui.set({ phase: "error", error: (e as Error).message || "The background couldn't be removed." });
      return;
    }
    if (made.size) {
      const float = this.ui.get().float;
      this.app.store.update(
        (s) => {
          let next = swapAssets(s, made);
          if (float) next = floatCard(next);
          return next;
        },
        { label: made.size > 1 ? "Remove backgrounds" : "Remove background" },
      );
      this.app.announce(made.size > 1 ? `Removed ${made.size} backgrounds` : "Background removed");
    }
    this.ui.set({ phase: "idle", download: null });
  }

  /** Put the original images back on every screen showing a cut-out. */
  restore(): void {
    const back = new Map<string, string>();
    for (const id of this.cutouts()) back.set(id, this.originals.get(id)!);
    if (!back.size) return;
    this.app.store.update((s) => swapAssets(s, back), { label: "Restore original" });
  }

  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
    for (const w of this.waiters.values()) w.reject(new Error("Closed"));
    this.waiters.clear();
  }

  private async cut(blob: Blob, width: number, height: number, shadow: boolean): Promise<File> {
    const url = URL.createObjectURL(blob);
    try {
      const alpha = await this.matte({ url, width, height });
      this.ui.set({ phase: "working" });
      let png = await renderCutout(url, alpha, width, height, { floor: ALPHA_FLOOR, fill: null });
      if (shadow) png = await bakeShadow(png, width, height);
      return new File([png], "cutout.png", { type: "image/png" });
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  private matte(input: MatteInput): Promise<Uint8ClampedArray> {
    const worker = this.spawn();
    const id = ++this.seq;
    return new Promise((resolve, reject) => {
      this.waiters.set(id, { resolve, reject });
      worker.postMessage({ kind: "run", id, op: "matte", input } satisfies ToWorker);
    });
  }

  private spawn(): Worker {
    if (this.worker) return this.worker;
    const worker = new Worker(new URL("../../cutout/worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<FromWorker>) => {
      const msg = event.data;
      switch (msg.kind) {
        case "booting":
          this.ui.set({ phase: "loading", download: null });
          break;
        case "fetch": {
          this.files.set(msg.file, { loaded: msg.loaded, total: msg.total });
          let loaded = 0;
          let total = 0;
          for (const f of this.files.values()) {
            loaded += Math.min(f.loaded, f.total);
            total += f.total;
          }
          this.ui.set({ download: total ? loaded / total : null });
          break;
        }
        case "started":
          this.ui.set({ phase: "working", download: null });
          break;
        case "done":
          this.waiters.get(msg.id)?.resolve(msg.value as Uint8ClampedArray);
          this.waiters.delete(msg.id);
          break;
        case "fail":
          if (msg.id !== null) {
            this.waiters.get(msg.id)?.reject(new Error(msg.message));
            this.waiters.delete(msg.id);
          }
          break;
      }
    };
    this.worker = worker;
    return worker;
  }
}

/** Replace screen images by asset id (old -> new), keeping crops and annotations. */
export function swapAssets(scene: Scene, map: ReadonlyMap<string, string>): Scene {
  let next = scene;
  if (next.content.kind === "image" && next.content.assetId && map.has(next.content.assetId))
    next = { ...next, content: { ...next.content, assetId: map.get(next.content.assetId)! } };
  if (next.slots?.some((s) => s.assetId && map.has(s.assetId)))
    next = {
      ...next,
      slots: next.slots.map((s) => (s.assetId && map.has(s.assetId) ? { ...s, assetId: map.get(s.assetId)! } : s)),
    };
  return next;
}

/** No frame, rectangular shadow, border or plate: the cut-out sits on the background. */
export function floatCard(scene: Scene): Scene {
  let s = setIn(scene, ["card", "frame", "id"], "none");
  s = setIn(s, ["card", "shadow", "preset"], "none");
  s = setIn(s, ["card", "border", "width"], 0);
  s = setIn(s, ["card", "inset", "width"], 0);
  if (s.card.stack) s = setIn(s, ["card", "stack"], null);
  return s;
}

/** A soft drop shadow shaped like the subject (canvas shadows follow alpha). */
async function bakeShadow(png: Blob, width: number, height: number): Promise<Blob> {
  const bmp = await createImageBitmap(png);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return png;
  const short = Math.min(width, height);
  ctx.shadowColor = "rgba(0, 0, 0, 0.32)";
  ctx.shadowBlur = Math.max(6, short * 0.035);
  ctx.shadowOffsetY = Math.max(3, short * 0.018);
  ctx.drawImage(bmp, 0, 0);
  bmp.close();
  const out = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
  return out ?? png;
}
