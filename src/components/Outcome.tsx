import { useEffect, useRef } from 'react'
import type { GameState } from '../game'
import { formatDuration } from '../hooks/useTimer'

interface OutcomeProps {
  game: GameState
  elapsedMs: number
  onRestart: () => void
  onKeepPlaying: () => void
}

/** Win or game-over panel. Moves focus to its main action when it appears. */
export function Outcome({ game, elapsedMs, onRestart, onKeepPlaying }: OutcomeProps) {
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
      className="lg-outcome absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 p-6 text-center"
    >
      <h2 id="outcome-title" className="lg-outcome-title">
        {game.over ? 'Game over' : 'You made 2048!'}
      </h2>
      <p className="lg-outcome-body">
        Score {game.score.toLocaleString()} in {formatDuration(elapsedMs)}
      </p>
      <div className="flex gap-2">
        {showWin && (
          <button ref={primary} type="button" onClick={onKeepPlaying} className="lg-btn lg-btn-primary">
            Keep playing
          </button>
        )}
        <button ref={showWin ? undefined : primary} type="button" onClick={onRestart} className={showWin ? 'lg-btn' : 'lg-btn lg-btn-primary'}>
          {game.over ? 'Try again' : 'New game'}
        </button>
      </div>
    </section>
  )
}
