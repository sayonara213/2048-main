import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { AnimatePresence } from 'framer-motion'
import type { Direction, GameState, Tile } from '../game'
import { toGrid } from '../game'
import { useSwipe } from '../hooks/useSwipe'
import { AnimatedTile } from '../effects'

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
  const board = useRef<HTMLDivElement>(null)
  const layer = useRef<HTMLDivElement>(null)
  const { cell, gap } = useCellSize(board, layer, size)

  // Tiles swallowed by this move's merges: keep them one more render, at the
  // merge destination, so they slide in under the merged tile.
  const [history, setHistory] = useState({ tiles: game.tiles, prev: [] as Tile[] })
  if (history.tiles !== game.tiles) setHistory({ tiles: game.tiles, prev: history.tiles })
  const ghosts = useMemo(() => {
    const prev = new Map(history.prev.map((t) => [t.id, t]))
    const out: Tile[] = []
    for (const t of game.tiles) {
      for (const id of t.mergedFrom ?? []) {
        const src = prev.get(id)
        if (src) out.push({ ...src, row: t.row, col: t.col, isNew: false, mergedFrom: undefined })
      }
    }
    return out
  }, [game.tiles, history.prev])

  return (
    <div
      {...swipe}
      ref={board}
      className="board relative aspect-square w-full touch-none select-none rounded-2xl bg-stone-800/70 p-[var(--gap)] shadow-2xl ring-1 ring-white/10 backdrop-blur-md"
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

      <div ref={layer} aria-hidden="true" className="pointer-events-none absolute inset-[var(--gap)]">
        {cell > 0 && (
          <AnimatePresence>
            {ghosts.map((t) => (
              <AnimatedTile key={t.id} {...t} cell={cell} gap={gap} ghost />
            ))}
            {game.tiles.map((t) => (
              <AnimatedTile
                key={t.id}
                value={t.value}
                row={t.row}
                col={t.col}
                cell={cell}
                gap={gap}
                isNew={t.isNew}
                merged={!!t.mergedFrom}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}

/** Measures one cell and the gap in px, tracking resizes. */
function useCellSize(board: RefObject<HTMLDivElement | null>, layer: RefObject<HTMLDivElement | null>, size: number) {
  const [dims, setDims] = useState({ cell: 0, gap: 0 })
  useLayoutEffect(() => {
    const b = board.current
    const l = layer.current
    if (!b || !l) return
    const measure = () => {
      const gap = parseFloat(getComputedStyle(b).paddingLeft) || 0
      const cell = (l.clientWidth - (size - 1) * gap) / size
      setDims((d) => (d.cell === cell && d.gap === gap ? d : { cell, gap }))
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(l)
    return () => ro.disconnect()
  }, [board, layer, size])
  return dims
}
