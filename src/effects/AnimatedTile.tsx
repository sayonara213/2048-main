import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { tileStyle } from './tileColors';
import { centerOf, fxBus } from './fxBus';
import { useEffects } from './useEffects';

export interface AnimatedTileProps {
  value: number;
  row: number;
  col: number;
  /** Cell edge length in px. */
  cell: number;
  /** Gap between cells in px. */
  gap: number;
  isNew?: boolean;
  merged?: boolean;
  /**
   * A tile that was just absorbed by a merge. Render it with its old id at the
   * merge destination so it visibly slides in underneath the merged tile.
   */
  ghost?: boolean;
}

const SLIDE = { type: 'spring', stiffness: 700, damping: 45, mass: 0.6 } as const;

/**
 * A single tile. Render it inside a `position: relative` layer whose origin is
 * the top-left cell, keyed by the tile's stable id so Framer Motion can slide
 * it between cells.
 */
export function AnimatedTile({ value, row, col, cell, gap, isNew, merged, ghost }: AnimatedTileProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { reduced } = useEffects();
  const style = tileStyle(value);
  const x = col * (cell + gap);
  const y = row * (cell + gap);
  const digits = String(value).length;
  const fontSize = cell * (digits <= 2 ? 0.45 : digits === 3 ? 0.38 : digits === 4 ? 0.3 : 0.24);

  // Fire a particle burst once the merged tile has slid into place.
  const prevValue = useRef(value);
  useEffect(() => {
    const grew = value > prevValue.current;
    prevValue.current = value;
    if (!(grew || merged) || ghost || reduced || !ref.current) return;
    const el = ref.current;
    const t = window.setTimeout(() => fxBus.emit({ type: 'merge', ...centerOf(el), value }), 90);
    return () => window.clearTimeout(t);
  }, [value, merged, ghost, reduced]);

  useEffect(() => {
    if (!isNew || reduced || !ref.current) return;
    const el = ref.current;
    const t = window.setTimeout(() => fxBus.emit({ type: 'spawn', ...centerOf(el) }), 120);
    return () => window.clearTimeout(t);
    // Only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const glow = value >= 128 ? `0 0 ${Math.min(8 + Math.log2(value) * 3, 40)}px ${style.bg}` : 'none';

  return (
    <motion.div
      ref={ref}
      initial={isNew ? { x, y, scale: 0, opacity: 0 } : merged ? { x, y, opacity: 0 } : false}
      animate={{ x, y, scale: 1, opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: ghost ? 0 : 0.1 } }}
      transition={reduced ? { duration: 0 } : { ...SLIDE, scale: { type: 'spring', stiffness: 500, damping: 18, delay: 0.08 }, opacity: { duration: 0.12, delay: 0.08 } }}
      style={{ position: 'absolute', left: 0, top: 0, width: cell, height: cell, zIndex: ghost ? 0 : merged ? 2 : 1 }}
    >
      <motion.div
        key={value}
        initial={merged && !reduced ? { scale: 1.28, rotate: -4 } : false}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 520, damping: 14, delay: 0.06 }}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: Math.round(cell * 0.12),
          background: style.bg,
          color: style.fg,
          boxShadow: `inset 0 -4px 0 rgba(0,0,0,.12), ${glow}`,
          display: 'grid',
          placeItems: 'center',
          fontWeight: 800,
          fontSize,
          fontVariantNumeric: 'tabular-nums',
          userSelect: 'none',
        }}
      >
        {value}
      </motion.div>
    </motion.div>
  );
}
