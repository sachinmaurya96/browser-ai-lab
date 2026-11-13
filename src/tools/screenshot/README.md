# Screenshot Studio

One tool page (`/tools/screenshot-beautifier`) holding every mode: screenshots and recordings, multi-screen mockups, 3D devices, AI cut-out, code images, quote cards and App Store sets.

## Where it comes from

The engine, editor controller and editor components are adapted from [Shotcandy](https://github.com/btahir/shotcandy) (MIT, © 2026 Bilal Tahir, upstream v0.2.0). The license is in `LICENSE` in this folder and must stay with the code. The wallpapers, sample screenshots and frame drawings in `public/screenshot-studio/` come from the same project under the same license. The canvas fonts (Figtree, Bricolage Grotesque, Geist Mono) are SIL OFL 1.1.

## Layout

```
engine/      framework-free renderer: scene model, layout, frames, export, animation, video, batch, storage
state/       undo/redo store (no React)
lib/         fonts, thumbnails, import worker, code highlighting
editor/      EditorApp controller (app.ts) and the React views
ui/          shared controls, Modal, Popover, portal host
styles/      the editor's CSS, scoped under .sst; lab.css is the Browser AI Lab skin
config.ts    storage prefix and project file extension
```

## What changed from upstream

- **Look:** every `--sc-*` token in `styles/tokens.css` resolves to the site's tokens (`--paper`, `--ink`, `--accent`…), so light and dark follow the site. `styles/lab.css` adds the Lab's details: ink buttons with a hard accent offset, ruled trays, mono kicker headings, serif display titles, the dotted paper stage.
- **Scoping:** component CSS is prefixed with `:where(.sst)` (no specificity change), so nothing leaks into other pages. Popovers, dialogs and the drag ghost portal into one `.sst` host (`ui/portal.ts`).
- **Embedding:** the editor lives in a framed box in the tool page (`.sst-frame`) with a full-screen mode. It measures its own frame, not the window: below 768 px of frame width it uses the compact (phone) layout, and the responsive rules are container queries on that frame.
- **Entry options:** `Editor` takes `start` (`mode`, `layout`, `tool`, `style`, `size`), merged under the URL's own parameters (e.g. `?mode=code`). Only the editor's parameters are removed from the address afterwards.
- **Lifecycle:** the editor disposes its workers when the page unmounts, and starts only after the stage is mounted. Fixed a Strict Mode bug where the stage never drew after a remount (`Stage.tsx`, the rAF ref is reset in cleanup).
- **Background remover:** `editor/cutout.ts` and `editor/CutoutTray.tsx` run the Background Remover tool's own worker (`tools/cutout/worker.ts`, RMBG-1.4) on every screen. Cut-outs are new PNG assets swapped in as one undo step; "Float the subject" turns off the card's frame, shadow, border and plate, and "Subject shadow" bakes an outline-shaped shadow into the PNG (the engine's card shadows are rectangular). The worker starts on first use.
- **3D devices:** `editor/device3d/stage.ts` builds phone, tablet, laptop, monitor and watch models procedurally in three.js (no vendor artwork); `editor/Device3D.tsx` is the dialog and tray. Each screen is rendered at 2200 px, trimmed, given a baked shadow and swapped in like a cut-out. three.js loads only when the dialog opens.
- **Additions beyond upstream:** 16 camera-angle presets (Card tray), six motion presets (Ken Burns, Orbit, Rise, Pop, Swing, Pull back), 3:2, 2:3 and 21:9 ratios, 5× export, foldable numbered trays, and Lab names for every preset (ids unchanged).
- **Quote mode:** quote cards are post content with `variant: "quote"` (author in `name`, source in `handle`) and `quoteStyle` classic/modern/bold, drawn in `engine/post/render.ts`. The library is `engine/post/quotes.ts`: only quotes with well-documented wording and attribution. Classic uses Instrument Serif (OFL), registered as the canvas `serif` font.
- **Branding:** no Shotcandy name, logo, links or candy wording in the UI; IndexedDB, storage keys and worker names use the `bailab-shots` prefix. Projects save as `.shots` and older `.shotcandy` files still open.

## Pulling an upstream fix

Most fixes land in `engine/`, which is close to upstream apart from the de-branding in a handful of strings. Diff the upstream file against the one here, then apply. Upstream imports use the `@/` alias; here they are relative.
