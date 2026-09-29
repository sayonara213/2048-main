export interface TileStyle {
  bg: string;
  fg: string;
  glow: number; // 0xRRGGBB for Pixi particles
}

// The Lagoon water scale: light shallows, deep water, then surfacing to the
// pearl. Every numeral pair clears 4.5:1.
const LIGHT = '#123b37'; // tile-ink-light
const DARK = '#f0fbf9'; // tile-ink-dark
const DEEP = '#0c2440'; // tile-ink-deep

const STYLES: Record<number, TileStyle> = {
  2: { bg: '#e3f4ef', fg: LIGHT, glow: 0xe3f4ef },
  4: { bg: '#c3ebdf', fg: LIGHT, glow: 0xc3ebdf },
  8: { bg: '#8edbc6', fg: LIGHT, glow: 0x8edbc6 },
  16: { bg: '#5cc8b2', fg: LIGHT, glow: 0x5cc8b2 },
  32: { bg: '#35ad9f', fg: LIGHT, glow: 0x4fd1bf },
  64: { bg: '#187a82', fg: DARK, glow: 0x2fb3bd },
  128: { bg: '#236c9c', fg: DARK, glow: 0x4a9fd6 },
  256: { bg: '#2a5a93', fg: DARK, glow: 0x5a8fd0 },
  512: { bg: '#274a85', fg: DARK, glow: 0x6c8fe0 },
  1024: { bg: '#8cc4ef', fg: DEEP, glow: 0x8cc4ef },
  2048: { bg: '#e9fbd9', fg: LIGHT, glow: 0xe9fbd9 },
};

export function tileStyle(value: number): TileStyle {
  // Values above 2048 stay pearls.
  return STYLES[value] ?? STYLES[2048]!;
}
