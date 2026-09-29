export interface TileStyle {
  bg: string;
  fg: string;
  glow: number; // 0xRRGGBB for Pixi particles
}

// Text/background pairs are chosen to keep >= 4.5:1 contrast.
const STYLES: Record<number, TileStyle> = {
  2: { bg: '#eee4da', fg: '#3b3228', glow: 0xeee4da },
  4: { bg: '#ede0c8', fg: '#3b3228', glow: 0xede0c8 },
  8: { bg: '#f2b179', fg: '#2a1a0c', glow: 0xf2b179 },
  16: { bg: '#f59563', fg: '#2a1206', glow: 0xf59563 },
  32: { bg: '#f67c5f', fg: '#1f0b05', glow: 0xf67c5f },
  64: { bg: '#f65e3b', fg: '#1a0602', glow: 0xf65e3b },
  128: { bg: '#edcf72', fg: '#2a2106', glow: 0xffe08a },
  256: { bg: '#edcc61', fg: '#2a2104', glow: 0xffd84d },
  512: { bg: '#9b7bff', fg: '#10062e', glow: 0xb49bff },
  1024: { bg: '#4fc3f7', fg: '#03202e', glow: 0x7fd8ff },
  2048: { bg: '#ffd400', fg: '#2a2300', glow: 0xfff176 },
};

const SUPER: TileStyle = { bg: '#ff4fd8', fg: '#2b0224', glow: 0xff7be3 };

export function tileStyle(value: number): TileStyle {
  return STYLES[value] ?? SUPER;
}
