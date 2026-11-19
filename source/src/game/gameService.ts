import { createInitialGame, type GameState } from './engine'

export interface GameService {
  readonly mode: 'local' | 'remote'
  load(): GameState
  save(state: GameState): void
  reset(): GameState
}

const SAVE_KEY = 'northstar-esg-save-v1'

function isValidSave(value: unknown): value is GameState {
  if (!value || typeof value !== 'object') return false
  const state = value as Partial<GameState>
  return state.version === 1 && typeof state.seed === 'number' && typeof state.week === 'number'
    && typeof state.resources === 'number' && !!state.stakeholders && Array.isArray(state.history)
}

export class LocalGameService implements GameService {
  readonly mode = 'local' as const

  load(): GameState {
    try {
      const saved = localStorage.getItem(SAVE_KEY)
      if (saved) {
        const parsed: unknown = JSON.parse(saved)
        if (isValidSave(parsed)) {
          const defaults = createInitialGame(parsed.seed)
          Object.keys(defaults.stakeholders).forEach((id) => {
            const savedPerson = parsed.stakeholders[id]
            if (savedPerson) {
              parsed.stakeholders[id] = {
                ...savedPerson,
                name: defaults.stakeholders[id].name,
                initials: defaults.stakeholders[id].initials,
                role: defaults.stakeholders[id].role,
                department: defaults.stakeholders[id].department,
              }
            }
          })
          return parsed
        }
      }
    } catch {
      // A damaged or unavailable local save should never prevent play.
    }
    return createInitialGame()
  }

  save(state: GameState): void {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state))
    } catch {
      // Private browsing or a full storage quota can disable persistence.
    }
  }

  reset(): GameState {
    const state = createInitialGame((Date.now() ^ 6011) >>> 0)
    this.save(state)
    return state
  }
}

// A future RemoteGameService can implement the same boundary with authenticated
// requests and server-authoritative turns, without changing the simulation UI.
export const gameService: GameService = new LocalGameService()
