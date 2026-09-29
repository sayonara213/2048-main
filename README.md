# 2048

The sliding-tile game, built with Vite, React, TypeScript and Tailwind CSS.

## Scripts

```bash
npm install
npm run dev        # start the dev server
npm test           # unit and component tests (Vitest)
npm run lint       # ESLint
npm run build      # typecheck and production build into dist/
```

## Layout

- `src/game/` holds the rules as pure functions (`newGame`, `move`, `slide`, `spawnTile`, `canMove`, `hasWon`). Randomness is injected so tests are deterministic, and tiles keep stable ids so the UI can animate them.
- `src/hooks/` wires the rules to React: game state, keyboard (arrows and WASD) and swipe input.
- `src/storage.ts` saves the game, best score, move count and play time to localStorage and validates it on load.
- `src/components/` is the DOM board, scoreboard (score with a `+N` per move, best, timer, moves) and controls.

## Accessibility

- Play with arrow keys, WASD, swipe, or the on-screen direction buttons.
- The board is exposed as a read-only table of cell values; the animated tile layer is hidden from assistive tech.
- A polite live region announces each move, merges, score and the new tile; an alert announces a win or game over, and focus moves to the next action.
- Animations only run when the OS has not asked for reduced motion.
- Tile colours meet WCAG AA text contrast.
