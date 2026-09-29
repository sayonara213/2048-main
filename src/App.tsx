import { describeMove, describeOutcome } from './announce'
import { Board } from './components/Board'
import { DirectionPad } from './components/DirectionPad'
import { Outcome } from './components/Outcome'
import { ScoreBoard } from './components/ScoreBoard'
import { useGame } from './hooks/useGame'
import { useKeyboardControls } from './hooks/useKeyboardControls'

export default function App() {
  const { game, last, seq, move, restart, keepPlaying } = useGame()
  const blocked = game.over || (game.won && !game.keepPlaying)
  useKeyboardControls(move, !blocked)

  // Alternate a trailing no-break space so screen readers re-read repeated text.
  const pad = seq % 2 ? ' ' : ''
  const status = last ? describeMove(last.direction, last.result) + pad : ''
  const outcome = describeOutcome(game)

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 px-4 py-8">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-5xl font-extrabold tracking-tight text-stone-100">2048</h1>
        <ScoreBoard score={game.score} bestTile={game.bestTile} />
      </header>

      <div className="flex items-center justify-between gap-4">
        <p id="how-to-play" className="text-sm text-stone-300">
          Use arrow keys, WASD, swipe, or the buttons below to join tiles and reach 2048.
        </p>
        <button type="button" onClick={restart} className="btn-primary shrink-0">
          New game
        </button>
      </div>

      <div className="relative">
        <Board game={game} onMove={move} />
        <Outcome game={game} onRestart={restart} onKeepPlaying={keepPlaying} />
      </div>

      <div className="flex justify-center">
        <DirectionPad onMove={move} disabled={blocked} />
      </div>

      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {status}
      </div>
      <div role="alert" aria-atomic="true" className="sr-only">
        {outcome}
      </div>
    </main>
  )
}
