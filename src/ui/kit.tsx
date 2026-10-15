import { useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Check, Copy } from 'lucide-react'

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ')
}

type Tone = 'primary' | 'ghost' | 'outline' | 'danger'

const tones: Record<Tone, string> = {
  primary:
    'bg-ink text-paper hover:bg-accent hover:text-accent-ink shadow-[3px_3px_0_var(--accent)] hover:shadow-[3px_3px_0_var(--ink)]',
  outline: 'border border-ink/80 text-ink hover:bg-ink hover:text-paper',
  ghost: 'text-ink-2 hover:text-ink hover:bg-paper-2',
  danger: 'border border-danger/60 text-danger hover:bg-danger hover:text-paper',
}

export function Button({
  tone = 'outline',
  size = 'md',
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone; size?: 'sm' | 'md' }) {
  return (
    <button
      type="button"
      {...rest}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all',
        'disabled:pointer-events-none disabled:opacity-40',
        size === 'sm' ? 'h-8 px-3 text-sm' : 'h-10 px-4 text-[15px]',
        tones[tone],
        className,
      )}
    >
      {children}
    </button>
  )
}

export function Panel({
  title,
  kicker,
  actions,
  children,
  className,
}: {
  title?: ReactNode
  kicker?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cx('rounded-xl border border-rule bg-card', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-5 py-3">
          <div className="min-w-0">
            {kicker && <Kicker>{kicker}</Kicker>}
            {title && <h2 className="truncate text-[15px] font-semibold">{title}</h2>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  )
}

export function Kicker({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cx('font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3', className)}>
      {children}
    </p>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  disabled,
}: {
  value: T
  options: { value: T; label: string; hint?: string }[]
  onChange: (v: T) => void
  label: string
  disabled?: boolean
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap rounded-lg border border-rule bg-paper p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          disabled={disabled}
          title={o.hint}
          onClick={() => onChange(o.value)}
          className={cx(
            'rounded-md px-3 py-1.5 text-sm transition-colors disabled:opacity-50',
            value === o.value ? 'bg-ink text-paper' : 'text-ink-2 hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Chip({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full border border-dashed border-ink-3 px-3 py-1 text-left text-sm text-ink-2 transition-colors hover:border-accent hover:text-accent disabled:opacity-40"
    >
      {children}
    </button>
  )
}

export function Tag({
  children,
  tone = 'plain',
}: {
  children: ReactNode
  tone?: 'plain' | 'accent' | 'sea' | 'sun'
}) {
  const map = {
    plain: 'bg-paper-2 text-ink-2',
    accent: 'bg-accent-soft text-accent',
    sea: 'bg-sea-soft text-sea',
    sun: 'bg-sun-soft text-sun',
  }
  return (
    <span className={cx('inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wide', map[tone])}>
      {children}
    </span>
  )
}

export function CopyButton({ text, label = 'Copy', disabled }: { text: string; label?: string; disabled?: boolean }) {
  const [done, setDone] = useState(false)
  return (
    <Button
      size="sm"
      tone="ghost"
      disabled={disabled || !text}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setDone(true)
          setTimeout(() => setDone(false), 1500)
        } catch {
          /* clipboard blocked; the text is still selectable */
        }
      }}
    >
      {done ? <Check size={15} /> : <Copy size={15} />}
      {done ? 'Copied' : label}
    </Button>
  )
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'error'; children: ReactNode }) {
  const map = {
    info: 'border-sea/40 bg-sea-soft text-ink',
    warn: 'border-sun/50 bg-sun-soft text-ink',
    error: 'border-danger/50 bg-accent-soft text-danger',
  }
  return <div role={tone === 'error' ? 'alert' : undefined} className={cx('rounded-lg border px-4 py-3 text-sm', map[tone])}>{children}</div>
}

export function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
        </label>
        {hint && <span className="font-mono text-[11px] text-ink-3">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

export const inputClass =
  'w-full rounded-lg border border-rule bg-paper px-3 py-2 text-[15px] text-ink placeholder:text-ink-3 focus:border-ink focus:outline-none'
