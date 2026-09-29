import { useEffect, useRef } from 'react'
import type { GameState } from '../game'

interface OutcomeProps {
  game: GameState
  onRestart: () => void
  onKeepPlaying: () => void
}

/** Win or game-over panel. Moves focus to its main action when it appears. */
export function Outcome({ game, onRestart, onKeepPlaying }: OutcomeProps) {
  const primary = useRef<HTMLButtonElement>(null)
  const showWin = game.won && !game.keepPlaying && !game.over
  const visible = game.over || showWin

  useEffect(() => {
    if (visible) primary.current?.focus()
  }, [visible])

  if (!visible) return null

  return (
    <section
      aria-labelledby="outcome-title"
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-2xl bg-stone-900/85 p-6 text-center motion-safe:animate-appear"
    >
      <h2 id="outcome-title" className="text-4xl font-extrabold text-white">
        {game.over ? 'Game over' : 'You made 2048!'}
      </h2>
      <p className="text-stone-200">Score {game.score}</p>
      <div className="flex gap-3">
        {showWin && (
          <button ref={primary} type="button" onClick={onKeepPlaying} className="btn-primary">
            Keep playing
          </button>
        )}
        <button ref={showWin ? undefined : primary} type="button" onClick={onRestart} className={showWin ? 'btn-secondary' : 'btn-primary'}>
          {game.over ? 'Try again' : 'New game'}
        </button>
      </div>
    </section>
  )
}
