import { useRef, useState } from 'react'
import { MoveHorizontal } from 'lucide-react'

/**
 * Drag-to-compare view: the original on the left of the handle, the result on
 * the right. Works with pointer and keyboard (arrow keys on the handle).
 */
export function Compare({
  before,
  after,
  width,
  height,
  backdrop,
}: {
  before: string
  after: string
  width: number
  height: number
  backdrop: React.ReactNode
}) {
  const [split, setSplit] = useState(50)
  const box = useRef<HTMLDivElement>(null)

  const moveTo = (clientX: number) => {
    const r = box.current?.getBoundingClientRect()
    if (!r) return
    setSplit(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)))
  }

  return (
    <div
      ref={box}
      className="relative mx-auto touch-none select-none overflow-hidden rounded-lg border border-rule"
      style={{ aspectRatio: `${width} / ${height}`, maxHeight: '70vh' }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        moveTo(e.clientX)
      }}
      onPointerMove={(e) => e.buttons && moveTo(e.clientX)}
    >
      <div className="absolute inset-0">{backdrop}</div>
      <img src={after} alt="Result with background removed" className="absolute inset-0 size-full object-contain" draggable={false} />
      <img
        src={before}
        alt="Original image"
        className="absolute inset-0 size-full object-contain"
        style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
        draggable={false}
      />
      <div className="absolute inset-y-0 w-0.5 bg-accent" style={{ left: `${split}%` }}>
        <button
          type="button"
          role="slider"
          aria-label="Compare original and result"
          aria-valuenow={Math.round(split)}
          aria-valuemin={0}
          aria-valuemax={100}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') setSplit((s) => Math.max(0, s - 5))
            if (e.key === 'ArrowRight') setSplit((s) => Math.min(100, s + 5))
          }}
          className="absolute top-1/2 left-1/2 grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-accent bg-card text-accent shadow"
        >
          <MoveHorizontal size={16} />
        </button>
      </div>
      <span className="absolute top-2 left-2 rounded bg-ink/80 px-1.5 py-0.5 font-mono text-[10px] uppercase text-paper">Before</span>
      <span className="absolute top-2 right-2 rounded bg-accent px-1.5 py-0.5 font-mono text-[10px] uppercase text-accent-ink">After</span>
    </div>
  )
}
