import { useCallback, useReducer } from 'react'
import { continueAfterWin, move, newGame } from '../game'
import type { Direction, GameState, MoveResult } from '../game'

interface Store {
  game: GameState
  /** Result of the most recent move attempt, used to build announcements. */
  last: { direction: Direction; result: MoveResult } | null
  /** Bumped on every action so identical announcements are still re-read. */
  seq: number
}

type Action = { type: 'move'; direction: Direction } | { type: 'new' } | { type: 'continue' }

function reducer(store: Store, action: Action): Store {
  switch (action.type) {
    case 'move': {
      const result = move(store.game, action.direction)
      return { game: result.state, last: { direction: action.direction, result }, seq: store.seq + 1 }
    }
    case 'new':
      return { game: newGame(store.game.size), last: null, seq: store.seq + 1 }
    case 'continue':
      return { ...store, game: continueAfterWin(store.game), seq: store.seq + 1 }
  }
}

export function useGame(size?: number) {
  const [store, dispatch] = useReducer(reducer, size, (s) => ({ game: newGame(s), last: null, seq: 0 }))
  return {
    ...store,
    move: useCallback((direction: Direction) => dispatch({ type: 'move', direction }), []),
    restart: useCallback(() => dispatch({ type: 'new' }), []),
    keepPlaying: useCallback(() => dispatch({ type: 'continue' }), []),
  }
}
