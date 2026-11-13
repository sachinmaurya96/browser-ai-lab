# Studio wallpapers

The 59 procedural 4K wallpapers in `public/screenshot-studio/backgrounds/` (silk, radiant, glow, fluid, prism, paper, patterns, orbs) are original artwork rendered from the shaders in `gen.html`, using the palettes in `specs.mjs`.

To add or change one, edit `specs.mjs`, then render with Playwright (not a project dependency):

```bash
npx -y -p playwright@1.60.0 node scripts/studio-wallpapers/render.mjs public/screenshot-studio/backgrounds [id,id,...]
```

Then list it in `src/tools/screenshot/engine/presets/data/backgrounds.json` (group `image`, a `collection`, `assetId: "builtin:<id>"`).
