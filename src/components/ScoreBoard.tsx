interface ScoreBoardProps {
  score: number
  bestTile: number
}

export function ScoreBoard({ score, bestTile }: ScoreBoardProps) {
  return (
    <dl className="flex gap-2">
      <Stat label="Score" value={score} />
      <Stat label="Best tile" value={bestTile} />
    </dl>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-20 rounded-lg bg-stone-700 px-3 py-1.5 text-center">
      <dt className="text-xs font-semibold tracking-wide text-stone-300 uppercase">{label}</dt>
      <dd className="text-xl font-bold text-white tabular-nums">{value}</dd>
    </div>
  )
}
