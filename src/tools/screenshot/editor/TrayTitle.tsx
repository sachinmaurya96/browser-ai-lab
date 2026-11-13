"use client";
/**
 * A tray's heading, as a button that folds the tray away. Trays are numbered
 * in order by CSS (01, 02 …), like sections in a lab notebook. Which trays are
 * folded is remembered in this browser.
 */
import { type ReactNode, useLayoutEffect, useRef } from "react";
import { Icon } from "../icons";
import { STORAGE_PREFIX } from "../config";
import { createStore, useStore } from "../lib/store";

const KEY = `${STORAGE_PREFIX}:folded`;

function load(): string[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

const folded = createStore<{ ids: string[] }>({ ids: typeof window === "undefined" ? [] : load() });

function toggle(id: string): void {
  const ids = folded.get().ids;
  const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
  folded.set({ ids: next });
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage blocked */
  }
}

export function TrayTitle({ id, children }: { id: string; children: ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const closed = useStore(folded, (s) => s.ids.includes(id));
  useLayoutEffect(() => {
    ref.current?.closest(".tray")?.toggleAttribute("data-folded", closed);
  }, [closed]);
  return (
    <h2 id={id} ref={ref} className="tray-title">
      <button
        type="button"
        className="tray-toggle"
        aria-expanded={!closed}
        onClick={() => toggle(id)}
      >
        <span className="tray-num" aria-hidden="true" />
        <span className="tray-name">{children}</span>
        <Icon name="chevronDown" size="xs" className="tray-chev" />
      </button>
    </h2>
  );
}
