// The 4K wallpaper library: original procedural artwork, rendered by gen.html.
// [id, label, collection, tone, kind, colors, seed, params]
const S = (id, label, collection, tone, kind, colors, seed = 1, p) => ({ id, label, collection, tone, kind, colors, seed, p })

export const SPECS = [
  // Silk: layered glossy waves (background first, then layers back to front)
  S('silk-sunset', 'Sunset Silk', 'Silk', 'vivid', 'silk', ['#1b1e4b', '#3b2f8f', '#e0613a', '#f2a65a', '#ffd7a0'], 1.2),
  S('silk-ocean', 'Ocean Silk', 'Silk', 'vivid', 'silk', ['#08163d', '#123d8f', '#1f6fe0', '#4fb0f7', '#c8ecff'], 2.7),
  S('silk-violet', 'Violet Silk', 'Silk', 'vivid', 'silk', ['#140c2b', '#3a1d9a', '#6a3ff0', '#a58bff', '#e8e0ff'], 4.1),
  S('silk-dawn', 'Dawn Silk', 'Silk', 'light', 'silk', ['#f6ebe3', '#f2c4b6', '#e98b94', '#a066d6', '#5b4bd8'], 5.3),
  S('silk-forest', 'Forest Silk', 'Silk', 'dark', 'silk', ['#08201b', '#14513f', '#238a6a', '#5ec3a0', '#d6f4e7'], 6.6),
  S('silk-ember', 'Ember Silk', 'Silk', 'dark', 'silk', ['#120808', '#5a1414', '#b8321f', '#ee6a35', '#ffc07a'], 7.9),
  S('silk-graphite', 'Graphite Silk', 'Silk', 'dark', 'silk', ['#0d0e10', '#272a30', '#4d525c', '#8d929d', '#e7e9ee'], 9.2),
  S('silk-bloom', 'Bloom Silk', 'Silk', 'light', 'silk', ['#fff0f4', '#ffc2d6', '#ff8fbf', '#c86bff', '#6550ff'], 10.4),

  // Radiant: soft blurred colour fields
  S('radiant-plum', 'Plum Haze', 'Radiant', 'light', 'radiant', ['#ece7f3', '#6a3c8c', '#c45a7a', '#b8b0de'], 1.1),
  S('radiant-iris', 'Iris Haze', 'Radiant', 'light', 'radiant', ['#e2e2f7', '#4b4fd1', '#8a3b6b', '#d5c9f3'], 2.3),
  S('radiant-peach', 'Peach Haze', 'Radiant', 'light', 'radiant', ['#ffffff', '#f07a58', '#f7c6b0', '#ffe5d9'], 3.6),
  S('radiant-coral', 'Coral Haze', 'Radiant', 'light', 'radiant', ['#fff6f1', '#e8492b', '#f7a37f', '#ffd2bf'], 4.4),
  S('radiant-sun', 'Sun Haze', 'Radiant', 'light', 'radiant', ['#ffffff', '#ef6a3a', '#f6c48f', '#fbe0c8'], 5.8, [0.4, 1]),
  S('radiant-tide', 'Tide Haze', 'Radiant', 'light', 'radiant', ['#f3f3fb', '#3d5bd9', '#e2672e', '#a8b6f0'], 6.2),
  S('radiant-orchid', 'Orchid Haze', 'Radiant', 'vivid', 'radiant', ['#fbe6f5', '#d649c6', '#f7a35c', '#f2b8ee'], 7.5),
  S('radiant-dusk', 'Dusk Haze', 'Radiant', 'dark', 'radiant', ['#121216', '#6b3fd1', '#e8505b', '#2a1a4a'], 8.8),
  S('radiant-gold', 'Gold Haze', 'Radiant', 'dark', 'radiant', ['#0f0e0c', '#f2b233', '#fff1c9', '#5a3d10'], 9.9, [0.6, 1]),

  // Glow: dark grounds with a glowing light edge
  S('glow-ember', 'Ember Edge', 'Glow', 'dark', 'glow', ['#000000', '#ff5a3c', '#ffd2b8'], 1.4, [1, 1]),
  S('glow-magenta', 'Magenta Edge', 'Glow', 'dark', 'glow', ['#000000', '#ff3cc7', '#ffd6f4'], 2.5, [-1, 1]),
  S('glow-rose', 'Rose Edge', 'Glow', 'dark', 'glow', ['#030103', '#d42a6b', '#ffb3cf'], 3.3, [1, -1]),
  S('glow-lavender', 'Lavender Edge', 'Glow', 'dark', 'glow', ['#020205', '#b9a7ff', '#ffffff'], 4.7, [-1, -1]),
  S('glow-mint', 'Mint Edge', 'Glow', 'dark', 'glow', ['#000000', '#39d98a', '#d8ffe9'], 5.1, [1, 1]),
  S('glow-silver', 'Silver Edge', 'Glow', 'dark', 'glow', ['#000000', '#dadde3', '#ffffff'], 6.9, [-1, 1]),
  S('glow-violet', 'Violet Edge', 'Glow', 'dark', 'glow', ['#010003', '#8b3cff', '#e7d6ff'], 7.2, [1, 1]),
  S('glow-cyan', 'Cyan Edge', 'Glow', 'dark', 'glow', ['#000000', '#39e6ff', '#e0fbff'], 8.6, [0, 1]),

  // Fluid: liquid swirls
  S('fluid-neon', 'Neon Fluid', 'Fluid', 'vivid', 'fluid', ['#120a3a', '#3a1fd1', '#ff3c8e', '#ffb347', '#fff1d6'], 1.7),
  S('fluid-pastel', 'Pastel Fluid', 'Fluid', 'light', 'fluid', ['#fdf3ff', '#c9d7ff', '#ffc4e1', '#b8f0e6', '#fff6c8'], 2.9),
  S('fluid-lagoon', 'Lagoon Fluid', 'Fluid', 'vivid', 'fluid', ['#031a2b', '#0b5a7a', '#1fb5b0', '#9ff0d8', '#f4fff9'], 3.8),
  S('fluid-magma', 'Magma Fluid', 'Fluid', 'dark', 'fluid', ['#0a0303', '#4a0d0d', '#c4301b', '#ff8c2e', '#ffe2a8'], 4.6),
  S('fluid-mint', 'Mint Fluid', 'Fluid', 'light', 'fluid', ['#f2fff9', '#bff2dc', '#7fd6c2', '#7aa8ff', '#e9e3ff'], 5.9),
  S('fluid-noir', 'Noir Fluid', 'Fluid', 'dark', 'fluid', ['#030304', '#14161c', '#3a3f4b', '#8f96a6', '#e8ebf2'], 6.3),

  // Prism: light-ray fans
  S('prism-blue', 'Blue Prism', 'Prism', 'vivid', 'rays', ['#0a1a6b', '#2c5cff', '#7fd0ff', '#2c5cff', '#0a1a6b'], 1.1),
  S('prism-sunrise', 'Sunrise Prism', 'Prism', 'vivid', 'rays', ['#1c2d8f', '#4f7bff', '#ffb36b', '#ff7a3c', '#1c2d8f'], 2.2),
  S('prism-violet', 'Violet Prism', 'Prism', 'vivid', 'rays', ['#240c6b', '#6a3cff', '#ff7ad9', '#6a3cff', '#240c6b'], 3.3),
  S('prism-teal', 'Teal Prism', 'Prism', 'vivid', 'rays', ['#04304a', '#0f8fa8', '#8ff0d0', '#0f8fa8', '#04304a'], 4.4),

  // Paper: textures (base, tint; p[0] = crumple)
  S('paper-crumpled-white', 'Crumpled White', 'Paper', 'light', 'paper', ['#f3f2ef', '#e6e3dc'], 1.3, [0.9, 0]),
  S('paper-smooth-grey', 'Smooth Grey', 'Paper', 'light', 'paper', ['#e4e4e2', '#d6d6d3'], 2.4, [0.15, 0]),
  S('paper-kraft', 'Kraft', 'Paper', 'light', 'paper', ['#c9b18e', '#b89c76'], 3.5, [0.7, 0]),
  S('paper-dark-kraft', 'Dark Kraft', 'Paper', 'dark', 'paper', ['#7d6448', '#5e4a33'], 4.6, [0.85, 0]),
  S('paper-cream', 'Cream Fibre', 'Paper', 'light', 'paper', ['#ece5d6', '#e0d6c1'], 5.7, [0.25, 0]),
  S('paper-slate', 'Slate Board', 'Paper', 'dark', 'paper', ['#3b3f45', '#2c3035'], 6.8, [0.35, 0]),

  // Clouds & camo: patterns (sky top, sky bottom, cloud lit, cloud shade; p = [scale, coverage])
  S('clouds-dusk', 'Dusk Clouds', 'Patterns', 'light', 'clouds', ['#6f6fb8', '#e7b8d0', '#fff3f6', '#9a86c4'], 1.9, [2.2, 0.02]),
  S('clouds-sage', 'Sage Clouds', 'Patterns', 'light', 'clouds', ['#4f6b5c', '#9fb7a0', '#f3f6ea', '#7e9783'], 2.8, [2.6, 0.06]),
  S('clouds-peach', 'Peach Clouds', 'Patterns', 'light', 'clouds', ['#f19a7a', '#ffcfb3', '#fff8f2', '#e7a790'], 3.7, [2.4, 0.0]),
  S('clouds-sky', 'Sky Clouds', 'Patterns', 'light', 'clouds', ['#2f7fd8', '#9ecbf5', '#ffffff', '#a9bfd8'], 4.5, [2.0, 0.05]),
  S('clouds-storm', 'Storm Clouds', 'Patterns', 'dark', 'clouds', ['#3b4656', '#7c8899', '#e2e7ee', '#5a6576'], 5.4, [2.3, 0.1]),
  S('clouds-teal', 'Teal Clouds', 'Patterns', 'light', 'clouds', ['#5d9c9a', '#b7d8d2', '#fbfffd', '#8fb5b0'], 6.1, [2.8, 0.04]),
  S('camo-forest', 'Forest Camo', 'Patterns', 'dark', 'camo', ['#1d2a1f', '#3c5236', '#6f8a5a', '#a9b98a'], 7.3),
  S('camo-desert', 'Desert Camo', 'Patterns', 'light', 'camo', ['#8a6f4e', '#b6996f', '#d8c39b', '#efe3c8'], 8.2),

  // Orbs: glows, rings and metallic spheres (p[0]: 0 orb, 1 ring, 2 metal)
  S('orb-amber', 'Amber Orb', 'Orbs', 'dark', 'orb', ['#050403', '#c8781e', '#ffd28a'], 1, [0]),
  S('orb-olive', 'Olive Orb', 'Orbs', 'dark', 'orb', ['#040503', '#9a9a52', '#f2f0c0'], 1, [0]),
  S('orb-sapphire', 'Sapphire Orb', 'Orbs', 'dark', 'orb', ['#020309', '#3f6fd8', '#cfe0ff'], 1, [0]),
  S('orb-pearl', 'Pearl Orb', 'Orbs', 'dark', 'orb', ['#030303', '#b9bcc4', '#ffffff'], 1, [0]),
  S('ring-mint', 'Mint Ring', 'Orbs', 'dark', 'orb', ['#020403', '#2fd894', '#c9ffe6'], 1, [1]),
  S('ring-ember', 'Ember Ring', 'Orbs', 'dark', 'orb', ['#050201', '#e0461f', '#ffc39a'], 1, [1]),
  S('ring-rose', 'Rose Ring', 'Orbs', 'dark', 'orb', ['#050203', '#e0507e', '#ffd0df'], 1, [1]),
  S('metal-steel', 'Steel', 'Orbs', 'dark', 'orb', ['#000000', '#e6e8ec', '#4d535c', '#ffffff'], 1, [2]),
  S('metal-gold', 'Gold Leaf', 'Orbs', 'vivid', 'orb', ['#000000', '#f3cf6a', '#7a5212', '#fff4c4'], 1, [2]),
  S('metal-ocean', 'Ocean Metal', 'Orbs', 'dark', 'orb', ['#000000', '#8fc2e6', '#1f4e6e', '#e8f6ff'], 1, [2]),
]
