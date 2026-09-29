import type { ReactNode } from 'react'
import { describeDuration, formatDuration } from '../hooks/useTimer'

interface ScoreBoardProps {
  score: number
  bestScore: number
  elapsedMs: number
  moves: number
  /** Points from the latest move, shown as a floating "+N". */
  gained: number
  /** Changes on every move so the "+N" badge replays its animation. */
  gainKey: number
}

export function ScoreBoard({ score, bestScore, elapsedMs, moves, gained, gainKey }: ScoreBoardProps) {
  return (
    <dl className="grid grid-cols-4 gap-2">
      <Stat label="Score">
        {score}
        {gained > 0 && (
          <span
            key={gainKey}
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -top-1 text-sm font-bold text-amber-300 motion-safe:animate-float-up motion-reduce:opacity-0"
          >
            +{gained}
          </span>
        )}
      </Stat>
      <Stat label="Best">{bestScore}</Stat>
      <Stat label="Time">
        {/* role=timer is not live, so the ticking clock is never read out on its own. */}
        <span role="timer" aria-label={describeDuration(elapsedMs)}>
          {formatDuration(elapsedMs)}
        </span>
      </Stat>
      <Stat label="Moves">{moves}</Stat>
    </dl>
  )
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="relative rounded-lg bg-stone-700 px-2 py-1.5 text-center">
      <dt className="text-xs font-semibold tracking-wide text-stone-300 uppercase">{label}</dt>
      <dd className="text-lg font-bold text-white tabular-nums sm:text-xl">{children}</dd>
    </div>
  )
}
