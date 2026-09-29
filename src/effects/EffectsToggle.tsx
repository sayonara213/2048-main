import { useEffects } from './useEffects';

/** Lets players turn motion down regardless of their OS setting. */
export function EffectsToggle({ className }: { className?: string }) {
  const { level, setLevel } = useEffects();
  const full = level === 'full';
  return (
    <button
      type="button"
      className={className}
      aria-pressed={full}
      onClick={() => setLevel(full ? 'reduced' : 'full')}
    >
      Effects: {full ? 'On' : 'Reduced'}
    </button>
  );
}
