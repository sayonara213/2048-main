import type { ReactNode } from 'react'
import { describeDuration, formatDuration } from '../hooks/useTimer'
import { AnimatedNumber, ScorePopups, type ScoreGain } from '../effects'

interface ScoreBoardProps {
  score: number
  bestScore: number
  elapsedMs: number
  moves: number
  /** Points from recent moves, shown as floating "+N" labels. */
  gains: ScoreGain[]
}

export function ScoreBoard({ score, bestScore, elapsedMs, moves, gains }: ScoreBoardProps) {
  return (
    <dl className="grid grid-cols-4 gap-2">
      <Stat label="Score">
        <AnimatedNumber value={score} />
        <ScorePopups gains={gains} />
      </Stat>
      <Stat label="Best">
        <AnimatedNumber value={bestScore} />
      </Stat>
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
    <div className="relative rounded-lg bg-stone-800/70 px-2 py-1.5 text-center ring-1 ring-white/10 backdrop-blur-md">
      <dt className="text-xs font-semibold tracking-wide text-stone-300 uppercase">{label}</dt>
      <dd className="text-lg font-bold text-white tabular-nums sm:text-xl">{children}</dd>
    </div>
  )
}
