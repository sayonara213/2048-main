import type { CSSProperties } from 'react'
import type { Direction, GameState } from '../game'
import { toGrid } from '../game'
import { useSwipe } from '../hooks/useSwipe'
import { tileClasses, tileTextSize } from './tileStyles'

interface BoardProps {
  game: GameState
  onMove: (direction: Direction) => void
}

/**
 * The board has two layers. A read-only table exposes the cell values to
 * assistive tech in reading order; the animated tile layer on top is purely
 * visual and hidden from the accessibility tree.
 */
export function Board({ game, onMove }: BoardProps) {
  const swipe = useSwipe(onMove)
  const grid = toGrid(game)
  const { size } = game

  return (
    <div
      {...swipe}
      className="board relative aspect-square w-full touch-none select-none rounded-2xl bg-stone-700 p-[var(--gap)]"
      style={{ '--size': size } as CSSProperties}
    >
      <div role="table" aria-label={`Game board, ${size} by ${size}`} className="grid h-full gap-[var(--gap)]">
        {grid.map((row, r) => (
          <div role="row" key={r} className="grid grid-cols-[repeat(var(--size),1fr)] gap-[var(--gap)]">
            {row.map((value, c) => (
              <div role="cell" key={c} className="rounded-xl bg-stone-600/80">
                <span className="sr-only">{value || 'empty'}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div aria-hidden="true" className="tile-layer pointer-events-none absolute inset-[var(--gap)]">
        {game.tiles.map((tile) => (
          <div
            key={tile.id}
            className="absolute top-0 left-0 size-[var(--cell)] motion-safe:transition-transform motion-safe:duration-100 motion-safe:ease-out"
            style={{ transform: `translate(calc(${tile.col} * (var(--cell) + var(--gap))), calc(${tile.row} * (var(--cell) + var(--gap))))` }}
          >
            <div
              className={[
                'flex size-full items-center justify-center rounded-xl font-bold tabular-nums shadow-md',
                tileClasses(tile.value),
                tileTextSize(tile.value),
                tile.mergedFrom ? 'motion-safe:animate-pop' : '',
                tile.isNew ? 'motion-safe:animate-appear' : '',
              ].join(' ')}
            >
              {tile.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
