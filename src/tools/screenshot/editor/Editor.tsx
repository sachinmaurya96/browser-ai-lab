"use client";
/** The editor root: wires the controller, global input, layout and modals. */
import { type RefObject, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "../styles/fonts.css";
import "../styles/tokens.css";
import "../styles/ui.css";
import "../styles/motion.css";
import "../styles/modes.css";
import "../styles/controls.css";
import "../styles/batch.css";
import "../styles/screens.css";
import "../styles/lab.css";
import { imageFromDataTransfer } from "../engine";
import { isBatch } from "../engine/batch/batch";
import { captureDrop, readCapture } from "../engine/input/files";
import { useStore } from "../lib/store";
import { EditorApp } from "./app";
import { AppContext, useApp, useScene, useUi } from "./context";
import { RecentsDialog, ShortcutsSheet } from "./Dialogs";
import { Device3DDialog } from "./Device3D";
import { Gallery } from "./Gallery";
import { Header } from "./Header";
import { Inspector } from "./Inspector";
import { MobileEditor } from "./Mobile";
import { useShortcuts } from "./shortcuts";
import { Stage } from "./Stage";
import { ScreenMenu } from "./ScreensLayer";
import { BatchRail } from "./BatchRail";
import { RAIL_COLLAPSED, useRailCollapsed } from "./batch-ui";

/** Below this frame width the editor uses its compact (phone) layout. */
const NARROW_FRAME = 768;

/**
 * Measure the editor's frame: it sits in the page next to the site's sidebar,
 * so the window width says little about the room it has. null until measured.
 */
function useFrameWidth(app: EditorApp, frame: RefObject<HTMLDivElement | null>): boolean | null {
  const [narrow, setNarrow] = useState<boolean | null>(null);
  useLayoutEffect(() => {
    const el = frame.current;
    if (!el) return;
    const measure = () => {
      const w = el.getBoundingClientRect().width;
      app.ui.set({ frameWidth: Math.round(w) });
      setNarrow(w < NARROW_FRAME);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [app, frame]);
  return narrow;
}

const OK_TYPES = ["image/png", "image/jpeg", "image/webp", ""];

function useDragAndDrop(app: EditorApp) {
  useEffect(() => {
    let depth = 0;
    const kind = (dt: DataTransfer | null): "ok" | "bad" | null => {
      if (!dt || !Array.from(dt.types ?? []).includes("Files")) return null;
      const items = Array.from(dt.items ?? []).filter((i) => i.kind === "file");
      if (!items.length) return "ok";
      return items.some((i) => OK_TYPES.includes(i.type)) ? "ok" : "bad";
    };
    const enter = (e: DragEvent) => {
      const k = kind(e.dataTransfer);
      if (!k) return;
      e.preventDefault();
      depth++;
      if (!app.ui.get().modal) app.ui.set({ drag: k });
    };
    const over = (e: DragEvent) => {
      if (kind(e.dataTransfer)) {
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
        // A multi-screen design: the screen under the pointer lights up.
        app.screens.hover(app.screens.at(e.clientX, e.clientY), "files");
      }
    };
    const leave = (e: DragEvent) => {
      if (!kind(e.dataTransfer)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) {
        app.ui.set({ drag: null });
        app.screens.endDrag();
      }
    };
    const drop = (e: DragEvent) => {
      depth = 0;
      app.ui.set({ drag: null });
      app.screens.endDrag();
      if (!e.dataTransfer) return;
      if (e.dataTransfer.types.includes("text/x-annotation")) return;
      // Onto a screen, or while the design has empty screens: the files fill them.
      if (app.ui.get().mode === "screenshot" && app.screens.takesFiles(e.clientX, e.clientY)) {
        const at = app.screens.at(e.clientX, e.clientY);
        const shot = captureDrop(e.dataTransfer);
        if (shot.files.length || shot.hasFolder) {
          e.preventDefault();
          void readCapture(shot).then((files) => app.screens.addFiles(files, at, "drop"));
          return;
        }
      }
      // Folders and several files: capture them now (the drop's data is gone after this event).
      const cap = captureDrop(e.dataTransfer);
      if (cap.hasFolder || cap.files.length > 1) {
        e.preventDefault();
        void readCapture(cap).then((files) =>
          app.importFiles(files, { source: "drop", folder: cap.hasFolder }),
        );
        return;
      }
      const f = imageFromDataTransfer(e.dataTransfer);
      const any = e.dataTransfer.files?.[0];
      if (f || any) e.preventDefault();
      if (f) void app.loadBlob(f, { source: "drop" });
      else if (any)
        app.toast({
          kind: "error",
          title: "Couldn't read that file",
          detail: "Drop a PNG, JPEG or WebP image.",
          prose: true,
        });
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragover", over);
    window.addEventListener("dragleave", leave);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragover", over);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("drop", drop);
    };
  }, [app]);
}

/** Screen-reader announcements; portalled so an open modal (which inerts the page) doesn't mute it. */
function LiveRegion() {
  const msg = useUi((s) => s.announce);
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const el = document.createElement("div");
    el.setAttribute("data-modal-keep", "");
    document.body.appendChild(el);
    setHost(el);
    return () => el.remove();
  }, []);
  const region = (
    <div className="sr-only" role="status" aria-live="polite" data-testid="status">
      {msg}
    </div>
  );
  return host ? createPortal(region, host) : region;
}

/**
 * The wide editor: header, stage, inspector; with a batch of images, the
 * images rail on the left (the grid only gains that column then).
 */
function WideLayout() {
  const app = useApp();
  const batch = useScene((s) => isBatch(s.doc));
  const mode = useUi((s) => s.mode);
  const on = batch && mode === "screenshot";
  const collapsed = useRailCollapsed();
  const railWidth = useStore(app.batch.ui, (s) => s.railWidth);
  const width = collapsed ? RAIL_COLLAPSED : railWidth;
  return (
    <div
      className="app"
      data-layout="wide"
      data-batch={on ? "" : undefined}
      style={on ? ({ "--sc-rail-w": `${width}px` } as React.CSSProperties) : undefined}
    >
      <Header />
      {on && <BatchRail />}
      <Stage />
      <Inspector />
    </div>
  );
}

/** Where a tool page opens the editor: a mode, a multi-screen layout, a tool or a style. */
export type EditorStart = Partial<Record<"mode" | "layout" | "tool" | "style" | "size", string>>;

export function Editor({ start }: { start?: EditorStart }) {
  const [app] = useState(() => new EditorApp());
  const frame = useRef<HTMLDivElement>(null);
  const narrow = useFrameWidth(app, frame);
  const fullscreen = useStore(app.ui, (s) => s.fullscreen);
  const disposeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef(start);
  const laidOut = narrow !== null;

  useEffect(() => {
    // Start once the stage is mounted (its effects run first), so it sees every change.
    if (!laidOut) return;
    // Strict Mode remounts at once: cancel the dispose the first cleanup queued.
    if (disposeTimer.current) clearTimeout(disposeTimer.current);
    void app.init(startRef.current);
    return () => {
      disposeTimer.current = setTimeout(() => app.dispose(), 0);
    };
  }, [app, laidOut]);

  // Full screen: the page behind must not scroll.
  useEffect(() => {
    if (!fullscreen) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = prev;
    };
  }, [fullscreen]);

  useShortcuts(app);
  useDragAndDrop(app);

  return (
    <AppContext.Provider value={app}>
      <div ref={frame} className="sst sst-frame" data-fullscreen={fullscreen || undefined}>
        {narrow === true && (
          <div className="sst-pane">
            <MobileEditor />
          </div>
        )}
        {narrow === false && (
          <div className="sst-pane">
            <WideLayout />
          </div>
        )}
      </div>
      <Gallery narrow={!!narrow} />
      <ShortcutsSheet />
      <RecentsDialog />
      <Device3DDialog />
      <ScreenMenu />
      <LiveRegion />
    </AppContext.Provider>
  );
}
