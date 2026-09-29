import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { MotionConfig, useReducedMotion } from 'framer-motion';

type EffectsLevel = 'full' | 'reduced';

interface EffectsState {
  /** True when the OS asks for reduced motion or the player turned effects down. */
  reduced: boolean;
  level: EffectsLevel;
  setLevel: (l: EffectsLevel) => void;
}

const STORAGE_KEY = 'fx-level';

function readStored(): EffectsLevel | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'full' || v === 'reduced' ? v : null;
  } catch {
    return null;
  }
}

const Ctx = createContext<EffectsState>({ reduced: false, level: 'full', setLevel: () => {} });

export function EffectsProvider({ children }: { children: ReactNode }) {
  const systemReduced = useReducedMotion() ?? false;
  const [stored, setStored] = useState<EffectsLevel | null>(readStored);
  const level: EffectsLevel = stored ?? (systemReduced ? 'reduced' : 'full');

  const setLevel = useCallback((l: EffectsLevel) => {
    setStored(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* storage unavailable: keep in memory only */
    }
  }, []);

  const value = useMemo(() => ({ reduced: level === 'reduced', level, setLevel }), [level, setLevel]);

  return (
    <Ctx.Provider value={value}>
      <MotionConfig reducedMotion={value.reduced ? 'always' : 'never'}>{children}</MotionConfig>
    </Ctx.Provider>
  );
}

export function useEffects() {
  return useContext(Ctx);
}
