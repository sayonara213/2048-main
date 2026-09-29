import { lazy, Suspense, useEffect, useRef, useState, type RefObject } from 'react'
import { describeMove, describeOutcome } from './announce'
import { Board } from './components/Board'
import { DirectionPad } from './components/DirectionPad'
import { Outcome } from './components/Outcome'
import { ScoreBoard } from './components/ScoreBoard'
import { useGame } from './hooks/useGame'
import { useKeyboardControls } from './hooks/useKeyboardControls'
import { useTimer } from './hooks/useTimer'
import { loadGame, saveGame } from './storage'
import { EffectsProvider, EffectsToggle, centerOf, fxBus, type ScoreGain } from './effects'

// PixiJS is large and purely decorative, so it loads after the game is playable.
const PixiStage = lazy(() => import('./effects/PixiStage').then((m) => ({ default: m.PixiStage })))

export default function App() {
  return (
    <EffectsProvider>
      <Suspense fallback={null}>
        <PixiStage />
      </Suspense>
      <Game />
    </EffectsProvider>
  )
}

function Game() {
  const [saved] = useState(loadGame)
  const { game, bestScore, last, seq, moves, move, restart, keepPlaying } = useGame(saved)
  const blocked = game.over || (game.won && !game.keepPlaying)
  // The clock starts on the first move and stops when the game ends or is won.
  const timer = useTimer(!blocked && moves > 0, saved?.elapsedMs)
  const elapsedSeconds = Math.floor(timer.elapsed / 1000)
  useKeyboardControls(move, !blocked)

  useEffect(() => {
    saveGame({ game, moves, bestScore, elapsedMs: elapsedSeconds * 1000 })
  }, [game, moves, bestScore, elapsedSeconds])

  const newGame = () => {
    restart()
    timer.reset()
  }

  // Alternate a trailing no-break space so screen readers re-read repeated text.
  const pad = seq % 2 ? ' ' : ''
  const status = last ? describeMove(last.direction, last.result) + pad : ''
  const outcome = describeOutcome(game, timer.elapsed)
  const gained = last?.result.moved ? last.result.scoreGained : 0
  const gains = useScoreGains(gained, seq)
  const boardArea = useRef<HTMLDivElement>(null)
  useOutcomeEffects(game.won, game.over, boardArea)

  return (
    <main className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 px-4 py-8">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-5xl font-extrabold tracking-tight text-stone-100">2048</h1>
        <div className="flex shrink-0 gap-2">
          <EffectsToggle className="btn-secondary text-sm" />
          <button type="button" onClick={newGame} className="btn-primary">
            New game
          </button>
        </div>
      </header>

      <ScoreBoard
        score={game.score}
        bestScore={bestScore}
        elapsedMs={timer.elapsed}
        moves={moves}
        gains={gains}
      />

      <p id="how-to-play" className="text-sm text-stone-300">
        Use arrow keys, WASD, swipe, or the buttons below to join tiles and reach 2048. Your game is saved in
        this browser.
      </p>

      <div ref={boardArea} className="relative">
        <Board game={game} onMove={move} />
        <Outcome game={game} elapsedMs={timer.elapsed} onRestart={newGame} onKeepPlaying={keepPlaying} />
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

/**
 * The last few per-move score gains, for the floating "+N" labels. Old ones
 * have already faded out, so the list only needs a cap, not timers.
 */
function useScoreGains(amount: number, seq: number) {
  const [state, setState] = useState<{ seq: number; gains: ScoreGain[] }>({ seq, gains: [] })
  if (state.seq !== seq) {
    const gains = amount > 0 ? [...state.gains.slice(-3), { id: seq, amount }] : state.gains
    setState({ seq, gains })
  }
  return state.gains
}

/** Confetti on a win, dimmed background on game over, reset on a new game. */
function useOutcomeEffects(won: boolean, over: boolean, area: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    if (won && area.current) fxBus.emit({ type: 'win', ...centerOf(area.current) })
  }, [won, area])
  useEffect(() => {
    fxBus.emit({ type: over ? 'gameOver' : 'reset' })
  }, [over])
}
