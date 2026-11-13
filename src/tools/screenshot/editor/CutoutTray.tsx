"use client";
/** "Remove background": cut the subject out of every screen with RMBG-1.4. */
import { memo } from "react";
import { Icon } from "../icons";
import { useStore } from "../lib/store";
import { Switch } from "../ui/controls";
import { TrayTitle } from "./TrayTitle";
import { useApp, useScene, useUi } from "./context";

export const CutoutTray = memo(function CutoutTray({ bare = false }: { bare?: boolean }) {
  const app = useApp();
  const c = app.cutout;
  const ui = useStore(c.ui, (s) => s);
  // Re-read on scene and asset changes (an image arriving, undo, a screen swap).
  useScene((s) => s.scene);
  useUi((s) => s.assetsVersion);
  const pending = c.pending().length;
  const cut = c.cutouts().length;
  const busy = ui.phase === "loading" || ui.phase === "working";

  const status =
    ui.phase === "loading"
      ? ui.download !== null
        ? `Downloading model ${Math.round(ui.download * 100)}%`
        : "Starting the model…"
      : ui.phase === "working"
        ? ui.total > 1
          ? `Cutting out ${Math.min(ui.done + 1, ui.total)} of ${ui.total}…`
          : "Cutting out the subject…"
        : null;

  const body = (
    <>
      <button
        type="button"
        className={`btn btn-secondary btn-block cutout-run${busy ? " pressed shimmer-busy" : ""}`}
        disabled={busy || pending === 0}
        aria-busy={busy}
        data-testid="remove-background"
        onClick={() => void c.remove()}
      >
        <Icon name="sparkle" size="sm" />
        {busy
          ? status
          : pending > 1
            ? `Remove backgrounds (${pending})`
            : cut && !pending
              ? "Background removed"
              : "Remove background"}
      </button>
      {ui.phase === "loading" && ui.download !== null && (
        <div className="cutout-meter" aria-hidden="true">
          <i style={{ width: `${Math.round(ui.download * 100)}%` }} />
        </div>
      )}
      {ui.error && (
        <p className="warn-note" role="alert">
          {ui.error}
        </p>
      )}
      <div className="toggle-row">
        <span className="label">
          Float the subject
          <small>No frame, card shadow or border behind the cut-out</small>
        </span>
        <Switch checked={ui.float} label="Float the subject" onChange={(float) => c.ui.set({ float })} />
      </div>
      <div className="toggle-row">
        <span className="label">
          Subject shadow
          <small>A soft shadow that follows its outline</small>
        </span>
        <Switch checked={ui.shadow} label="Subject shadow" onChange={(shadow) => c.ui.set({ shadow })} />
      </div>
      {cut > 0 && (
        <button type="button" className="link quiet" onClick={() => c.restore()}>
          <Icon name="undo" size="xs" /> Restore original{cut > 1 ? "s" : ""}
        </button>
      )}
      <p className="note">
        RMBG-1.4 runs on your device. The first use downloads the model once (about 170 MB). The
        model is licensed for non-commercial use.
      </p>
    </>
  );
  if (bare) return <div className="cutout-tray">{body}</div>;
  return (
    <section className="tray cutout-tray" aria-labelledby="t-cutout" data-testid="cutout-tray">
      <div className="tray-head">
        <TrayTitle id="t-cutout">Cut-out</TrayTitle>
        <span className="meta">AI</span>
      </div>
      {body}
    </section>
  );
});
