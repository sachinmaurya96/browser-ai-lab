/** Placeholder while a tool's code chunk loads. Reserves height so the page below doesn't jump. */
export function ToolLoading() {
  return (
    <div role="status" aria-live="polite" className="paper-grid flex min-h-[420px] items-center justify-center rounded-xl border border-dashed border-rule">
      <p className="font-mono text-sm text-ink-3">Loading tool…</p>
    </div>
  )
}
