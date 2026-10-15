import { Cpu, Download, HardDrive, RotateCw, Zap } from 'lucide-react'
import { downloadBytes, downloadRatio, type Model } from '../lib/useModel'
import { formatBytes } from '../lib/images'
import { Button, Kicker, Tag, cx } from './kit'

export interface ModelInfo {
  name: string
  href: string
  size: string
  task: string
  license?: string
}

/**
 * Status strip shown at the top of every tool: what model it uses, whether it
 * is downloaded, and which backend it ended up on.
 */
export function ModelCard({ model, info, autoNote }: { model: Model; info: ModelInfo; autoNote?: string }) {
  const ratio = downloadRatio(model.files)
  const bytes = downloadBytes(model.files)
  const pct = ratio === null ? 0 : Math.round(ratio * 100)

  return (
    <div className="overflow-hidden rounded-xl border border-ink/80 bg-card">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
        <div className="min-w-0 flex-1">
          <Kicker>Model · {info.task}</Kicker>
          <a
            href={info.href}
            target="_blank"
            rel="noreferrer"
            className="block truncate font-mono text-sm font-medium underline decoration-rule underline-offset-4 hover:decoration-accent"
          >
            {info.name}
          </a>
        </div>

        <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Stat icon={<HardDrive size={14} />} label="Download" value={info.size} />
          <Stat
            icon={model.device === 'webgpu' || (!model.device && model.gpu?.webgpu) ? <Zap size={14} /> : <Cpu size={14} />}
            label="Backend"
            value={
              model.device
                ? model.device === 'webgpu'
                  ? 'WebGPU'
                  : 'WASM (CPU)'
                : model.gpu
                  ? model.gpu.webgpu
                    ? 'WebGPU available'
                    : 'CPU fallback'
                  : 'checking…'
            }
          />
        </dl>

        <div className="flex items-center gap-2">
          {model.phase === 'ready' && <Tag tone="sea">● Ready</Tag>}
          {model.phase === 'idle' && (
            <Button tone="primary" size="sm" onClick={model.boot}>
              <Download size={15} /> Load model
            </Button>
          )}
          {model.phase === 'downloading' && <Tag tone="sun">Loading {ratio !== null ? `${pct}%` : '…'}</Tag>}
          {model.phase === 'error' && (
            <Button tone="danger" size="sm" onClick={model.boot}>
              <RotateCw size={15} /> Retry
            </Button>
          )}
        </div>
      </div>

      {model.phase === 'downloading' && (
        <div className="border-t border-rule px-5 py-3">
          <div className="mb-1.5 flex justify-between font-mono text-[11px] text-ink-3">
            <span>{ratio === null ? 'Preparing…' : ratio >= 1 ? 'Initialising on device…' : 'Downloading weights'}</span>
            {bytes.total > 0 && (
              <span>
                {formatBytes(bytes.loaded)} / {formatBytes(bytes.total)}
              </span>
            )}
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-paper-2" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div
              className={cx('h-full rounded-full bg-accent transition-[width] duration-300', ratio === null && 'w-1/4 animate-pulse')}
              style={ratio === null ? undefined : { width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {model.phase === 'error' && model.error && (
        <p className="border-t border-rule px-5 py-3 text-sm text-danger" role="alert">
          {model.error}
        </p>
      )}

      {(model.phase === 'idle' || info.license) && (
        <p className="border-t border-dashed border-rule bg-paper px-5 py-2 text-xs text-ink-3">
          {model.phase === 'idle' && (autoNote ?? 'Downloads once, then is cached by your browser. ')}
          {info.license && <span>{info.license}</span>}
        </p>
      )}
    </div>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <dt className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-wide text-ink-3">
        {icon}
        {label}
      </dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}
