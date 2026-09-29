import type { Direction } from '../game'

const BUTTONS: { direction: Direction; label: string; path: string; area: string }[] = [
  { direction: 'up', label: 'Move up', path: 'M12 19V5M5 12l7-7 7 7', area: 'col-start-2 row-start-1' },
  { direction: 'left', label: 'Move left', path: 'M19 12H5M12 5l-7 7 7 7', area: 'col-start-1 row-start-2' },
  { direction: 'down', label: 'Move down', path: 'M12 5v14M5 12l7 7 7-7', area: 'col-start-2 row-start-2' },
  { direction: 'right', label: 'Move right', path: 'M5 12h14M12 5l7 7-7 7', area: 'col-start-3 row-start-2' },
]

/** On-screen controls for switch, screen reader and pointer-only players. */
export function DirectionPad({ onMove, disabled }: { onMove: (d: Direction) => void; disabled?: boolean }) {
  return (
    <div role="group" aria-label="Move tiles" className="lg-dpad">
      {BUTTONS.map((b) => (
        <button
          key={b.direction}
          type="button"
          aria-label={b.label}
          disabled={disabled}
          onClick={() => onMove(b.direction)}
          className={`lg-btn ${b.area}`}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d={b.path} />
          </svg>
        </button>
      ))}
    </div>
  )
}
