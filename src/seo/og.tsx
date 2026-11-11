import { ImageResponse } from 'next/og'

export const OG_SIZE = { width: 1200, height: 630 }

/** 1200×630 social card in the site's paper/ink/accent palette. */
export function ogImage({ kicker, title, subtitle }: { kicker: string; title: string; subtitle?: string }) {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#f5f1ea', padding: 72, color: '#1b1a17' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: 14, background: '#1b1a17', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 30, height: 30, borderRadius: 999, border: '6px solid #e8553a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 10, height: 10, borderRadius: 999, background: '#f5f1ea' }} />
            </div>
          </div>
          <div style={{ fontSize: 34, fontStyle: 'italic' }}>Browser AI Lab</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 26, letterSpacing: 4, textTransform: 'uppercase', color: '#e8553a' }}>{kicker}</div>
          <div style={{ fontSize: title.length > 40 ? 64 : 80, lineHeight: 1.04, marginTop: 16, maxWidth: 1050 }}>{title}</div>
          {subtitle && <div style={{ fontSize: 30, marginTop: 24, color: '#57524a', maxWidth: 1000 }}>{subtitle}</div>}
        </div>
        <div style={{ display: 'flex', gap: 28, fontSize: 24, color: '#57524a' }}>
          <span>Free</span>
          <span>·</span>
          <span>Runs in your browser</span>
          <span>·</span>
          <span>Files never uploaded</span>
        </div>
      </div>
    ),
    OG_SIZE,
  )
}
