import type { Direction } from '../game'

const BUTTONS: { direction: Direction; label: string; glyph: string; area: string }[] = [
  { direction: 'up', label: 'Move up', glyph: '↑', area: 'col-start-2 row-start-1' },
  { direction: 'left', label: 'Move left', glyph: '←', area: 'col-start-1 row-start-2' },
  { direction: 'down', label: 'Move down', glyph: '↓', area: 'col-start-2 row-start-2' },
  { direction: 'right', label: 'Move right', glyph: '→', area: 'col-start-3 row-start-2' },
]

/** On-screen controls for switch, screen reader and pointer-only players. */
export function DirectionPad({ onMove, disabled }: { onMove: (d: Direction) => void; disabled?: boolean }) {
  return (
    <div role="group" aria-label="Move tiles" className="grid grid-cols-3 grid-rows-2 gap-2">
      {BUTTONS.map((b) => (
        <button
          key={b.direction}
          type="button"
          aria-label={b.label}
          disabled={disabled}
          onClick={() => onMove(b.direction)}
          className={`${b.area} size-12 rounded-lg bg-stone-700 text-xl text-white hover:bg-stone-600 disabled:opacity-40`}
        >
          <span aria-hidden="true">{b.glyph}</span>
        </button>
      ))}
    </div>
  )
}
