"use client";
/**
 * 3D devices: put each screen of the design inside a real 3D phone, tablet,
 * laptop, monitor or watch (our own procedural models, ./device3d/stage.ts),
 * turn it to any angle, and place the render back into the design as a
 * transparent image. three.js loads only when the dialog opens.
 */
import { memo, useEffect, useRef, useState } from "react";
import { type Scene, screenContent, shownScreens } from "../engine";
import { Icon } from "../icons";
import { Modal } from "../ui/Modal";
import { Segmented, Switch } from "../ui/controls";
import type { EditorApp } from "./app";
import { useApp, useScene, useUi } from "./context";
import { floatCard, swapAssets } from "./cutout";
import { TrayTitle } from "./TrayTitle";
import type {
  DeviceKind,
  DeviceOptions,
  DeviceStage,
  Finish,
  Orientation,
  ScreenFit,
} from "./device3d/stage";

type StageModule = typeof import("./device3d/stage");

/** Device render asset id -> the screenshot it was made from, per editor. */
const originals = new WeakMap<EditorApp, Map<string, string>>();
const mapFor = (app: EditorApp) => {
  let m = originals.get(app);
  if (!m) originals.set(app, (m = new Map()));
  return m;
};

/** Screens on the stage holding a still image (not yet a device render). */
function imageScreens(app: EditorApp, scene: Scene = app.scene): string[] {
  if (scene.content.kind !== "image") return [];
  const map = mapFor(app);
  const out: string[] = [];
  for (let i = 0; i < shownScreens(scene); i++) {
    const id = screenContent(scene, i)?.assetId;
    const e = id ? app.library.entry(id) : undefined;
    if (id && e && !e.video && !map.has(id) && !out.includes(id)) out.push(id);
  }
  return out;
}

function renders(app: EditorApp, scene: Scene = app.scene): string[] {
  if (scene.content.kind !== "image") return [];
  const map = mapFor(app);
  const out: string[] = [];
  for (let i = 0; i < shownScreens(scene); i++) {
    const id = screenContent(scene, i)?.assetId;
    if (id && map.has(id)) out.push(id);
  }
  return out;
}

export const Device3DTray = memo(function Device3DTray({ bare = false }: { bare?: boolean }) {
  const app = useApp();
  useScene((s) => s.scene);
  useUi((s) => s.assetsVersion);
  const n = imageScreens(app).length;
  const placed = renders(app).length;
  const restore = () => {
    const map = mapFor(app);
    const back = new Map<string, string>();
    for (const id of renders(app)) back.set(id, map.get(id)!);
    if (back.size) app.store.update((s) => swapAssets(s, back), { label: "Restore screenshot" });
  };
  const body = (
    <>
      <button
        type="button"
        className="btn btn-secondary btn-block device3d-open"
        disabled={n === 0}
        data-testid="open-device3d"
        onClick={() => app.ui.set({ modal: "device3d", popover: null })}
      >
        <Icon name="cube" size="sm" /> Open 3D device studio
      </button>
      <p className="note">
        Phone, tablet, laptop, monitor or watch, in five finishes. Drag to turn it to any angle.
      </p>
      {placed > 0 && (
        <button type="button" className="link quiet" onClick={restore}>
          <Icon name="undo" size="xs" /> Back to the flat screenshot{placed > 1 ? "s" : ""}
        </button>
      )}
    </>
  );
  if (bare) return <div className="device3d-tray">{body}</div>;
  return (
    <section className="tray device3d-tray" aria-labelledby="t-device3d" data-testid="device3d-tray">
      <div className="tray-head">
        <TrayTitle id="t-device3d">3D device</TrayTitle>
        <span className="meta">{n > 1 ? `${n} screens` : "WebGL"}</span>
      </div>
      {body}
    </section>
  );
});

export function Device3DDialog() {
  const app = useApp();
  const open = useUi((s) => s.modal === "device3d");
  return (
    <Modal
      open={open}
      onClose={() => app.ui.set({ modal: null })}
      labelledBy="d3-title"
      className="dialog device3d-dialog"
    >
      {open && <Device3DBody />}
    </Modal>
  );
}

function Device3DBody() {
  const app = useApp();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [mod, setMod] = useState<StageModule | null>(null);
  const [stage, setStage] = useState<DeviceStage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [opts, setOpts] = useState<DeviceOptions>({
    kind: "phone",
    finish: "graphite",
    orientation: "auto",
    fit: "cover",
  });
  const [view, setView] = useState("hero-left");
  const [shadow, setShadow] = useState(true);
  const [float, setFloat] = useState(true);
  const targets = useRef(imageScreens(app));

  // Load three.js and the stage, then the first screen's image.
  useEffect(() => {
    let live = true;
    let made: DeviceStage | null = null;
    import("./device3d/stage")
      .then(async (m) => {
        if (!live || !canvasRef.current) return;
        made = new m.DeviceStage(canvasRef.current);
        const r = boxRef.current!.getBoundingClientRect();
        made.resize(r.width, r.height);
        const first = targets.current[0];
        const e = first ? app.library.entry(first) : undefined;
        if (e) await made.setImage(e.blob);
        if (!live) return made.dispose();
        setMod(m);
        setStage(made);
      })
      .catch((e: unknown) =>
        live && setError(e instanceof Error ? e.message : "3D isn't available in this browser."),
      );
    return () => {
      live = false;
      made?.dispose();
    };
  }, [app]);

  useEffect(() => {
    const el = boxRef.current;
    if (!el || !stage) return;
    const ro = new ResizeObserver(([e]) => stage.resize(e!.contentRect.width, e!.contentRect.height));
    ro.observe(el);
    return () => ro.disconnect();
  }, [stage]);

  const set = (patch: Partial<DeviceOptions>) => {
    setOpts((o) => ({ ...o, ...patch }));
    stage?.setOptions(patch);
    if (patch.kind) setView(patch.kind === "laptop" ? "above" : "hero-left");
  };

  const place = async () => {
    if (!stage) return;
    const ids = targets.current;
    const made = new Map<string, string>();
    try {
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i]!;
        const e = app.library.entry(id);
        if (!e) continue;
        setBusy(ids.length > 1 ? `Rendering ${i + 1} of ${ids.length}…` : "Rendering…");
        if (i > 0) await stage.setImage(e.blob);
        const png = await stage.snapshot(2200, shadow);
        const { added } = await app.batch.importImages([new File([png], "device.png", { type: "image/png" })]);
        const nid = added[0]?.id;
        if (nid && nid !== id) {
          made.set(id, nid);
          mapFor(app).set(nid, id);
        }
      }
    } catch (e) {
      setBusy(null);
      setError(e instanceof Error ? e.message : "The render failed.");
      return;
    }
    if (made.size)
      app.store.update(
        (s) => {
          const next = swapAssets(s, made);
          return float ? floatCard(next) : next;
        },
        { label: "Place in 3D device" },
      );
    setBusy(null);
    app.ui.set({ modal: null });
    app.announce("Placed in a 3D device");
  };

  const kinds = mod?.DEVICES ?? [];
  return (
    <>
      <div className="dialog-head">
        <div style={{ flex: 1 }}>
          <h2 id="d3-title">3D device studio</h2>
          <p className="muted" style={{ marginTop: 2 }}>
            Drag to turn the device, scroll to move closer.
            {targets.current.length > 1 && ` Every screen (${targets.current.length}) is placed with the same device and angle.`}
          </p>
        </div>
        <button type="button" className="icon-btn" aria-label="Close" onClick={() => app.ui.set({ modal: null })}>
          <Icon name="x" />
        </button>
      </div>
      <div className="d3-body">
        <div ref={boxRef} className="d3-view" data-testid="d3-view">
          <canvas ref={canvasRef} aria-label="3D device preview. Drag to rotate." />
          {!stage && !error && <span className="d3-loading">Loading 3D…</span>}
          {error && (
            <p className="warn-note d3-error" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="d3-side">
          <div className="sub">Device</div>
          <div className="d3-devices" role="radiogroup" aria-label="Device">
            {kinds.map((k) => (
              <button
                key={k.id}
                type="button"
                role="radio"
                aria-checked={opts.kind === k.id}
                className={`opt${opts.kind === k.id ? " on" : ""}`}
                disabled={!stage}
                onClick={() => set({ kind: k.id as DeviceKind })}
              >
                {k.label}
              </button>
            ))}
          </div>
          <div className="sub">Finish</div>
          <div className="d3-finishes" role="radiogroup" aria-label="Finish">
            {(mod?.FINISHES ?? []).map((f) => (
              <button
                key={f.id}
                type="button"
                role="radio"
                aria-checked={opts.finish === f.id}
                aria-label={f.label}
                title={f.label}
                className={`d3-swatch${opts.finish === f.id ? " on" : ""}`}
                style={{ background: f.color }}
                disabled={!stage}
                onClick={() => set({ finish: f.id as Finish })}
              />
            ))}
          </div>
          <div className="sub">Angle</div>
          <div className="d3-views">
            {(mod?.VIEWS ?? []).map((v) => (
              <button
                key={v.id}
                type="button"
                className={`opt${view === v.id ? " on" : ""}`}
                disabled={!stage}
                onClick={() => {
                  setView(v.id);
                  stage?.view(v.id);
                }}
              >
                {v.label}
              </button>
            ))}
          </div>
          {opts.kind !== "laptop" && opts.kind !== "monitor" && opts.kind !== "watch" && (
            <>
              <div className="sub">Orientation</div>
              <Segmented<Orientation>
                label="Orientation"
                value={opts.orientation}
                onChange={(orientation) => set({ orientation })}
                options={[
                  { value: "auto", label: "Auto" },
                  { value: "portrait", label: "Portrait" },
                  { value: "landscape", label: "Landscape" },
                ]}
              />
            </>
          )}
          <div className="sub">Screen</div>
          <Segmented<ScreenFit>
            label="Screen fit"
            value={opts.fit}
            onChange={(fit) => set({ fit })}
            options={[
              { value: "cover", label: "Fill" },
              { value: "contain", label: "Fit whole" },
            ]}
          />
          <div className="toggle-row">
            <span className="label">Soft shadow</span>
            <Switch checked={shadow} label="Soft shadow" onChange={setShadow} />
          </div>
          <div className="toggle-row">
            <span className="label">Float on the background</span>
            <Switch checked={float} label="Float on the background" onChange={setFloat} />
          </div>
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={!stage || !!busy}
            data-testid="d3-place"
            onClick={() => void place()}
          >
            <Icon name="check" /> {busy ?? "Place in design"}
          </button>
        </div>
      </div>
    </>
  );
}
