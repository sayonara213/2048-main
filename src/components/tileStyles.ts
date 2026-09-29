/**
 * Tile colours. Each pair was picked for at least 4.5:1 text contrast
 * (WCAG AA): dark text on the light tiles, white text on the saturated ones.
 */
const TILE_CLASSES: Record<number, string> = {
  2: 'bg-stone-100 text-stone-900',
  4: 'bg-amber-100 text-stone-900',
  8: 'bg-orange-300 text-stone-900',
  16: 'bg-orange-400 text-stone-950',
  32: 'bg-red-300 text-stone-950',
  64: 'bg-red-700 text-white',
  128: 'bg-yellow-300 text-stone-900',
  256: 'bg-yellow-700 text-white',
  512: 'bg-emerald-700 text-white',
  1024: 'bg-sky-700 text-white',
  2048: 'bg-violet-700 text-white',
}

export function tileClasses(value: number): string {
  return TILE_CLASSES[value] ?? 'bg-stone-900 text-white'
}

export function tileTextSize(value: number): string {
  const digits = String(value).length
  if (digits <= 2) return 'text-[length:calc(var(--cell)*0.45)]'
  if (digits === 3) return 'text-[length:calc(var(--cell)*0.36)]'
  if (digits === 4) return 'text-[length:calc(var(--cell)*0.28)]'
  return 'text-[length:calc(var(--cell)*0.22)]'
}
