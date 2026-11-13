// Render the wallpaper library. usage: node render-walls.mjs <outDir> [id,id,...]
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { SPECS } from './specs.mjs'

const [, , OUT, only] = process.argv
const pick = only ? SPECS.filter((s) => only.split(',').includes(s.id)) : SPECS
mkdirSync(join(OUT, 'thumbs'), { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage()
page.on('pageerror', (e) => console.error('pageerror', e.message))
await page.goto('file://' + new URL('./gen.html', import.meta.url).pathname)
await page.waitForFunction(() => window.ready === true)
for (const s of pick) {
  const t0 = Date.now()
  const { full, thumb } = await page.evaluate((spec) => window.render(spec), s)
  writeFileSync(join(OUT, `${s.id}.webp`), Buffer.from(full, 'base64'))
  writeFileSync(join(OUT, 'thumbs', `${s.id}.webp`), Buffer.from(thumb, 'base64'))
  console.log(s.id, Math.round(Buffer.from(full, 'base64').length / 1024) + 'KB', Date.now() - t0 + 'ms')
}
await browser.close()
