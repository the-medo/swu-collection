const GAME_RESULTS_LAST_UPDATED_KEY = 'game-results-last-updated';

interface GameResultsLastUpdated {
  [scopeId: string]: string;
}

export function getGameResultsLastUpdatedFromStorage(): GameResultsLastUpdated {
  try {
    const stored = localStorage.getItem(GAME_RESULTS_LAST_UPDATED_KEY);
    return stored ? (JSON.parse(stored) as GameResultsLastUpdated) : {};
  } catch {
    return {};
  }
}

export function setGameResultsLastUpdatedInStorage(scopeId: string, datetime: string): void {
  try {
    const current = getGameResultsLastUpdatedFromStorage();
    current[scopeId] = datetime;
    localStorage.setItem(GAME_RESULTS_LAST_UPDATED_KEY, JSON.stringify(current));
  } catch {
    // Ignore storage errors
  }
}

export function clearGameResultsLastUpdatedInStorage(scopeId: string): void {
  try {
    const current = getGameResultsLastUpdatedFromStorage();

    if (!(scopeId in current)) {
      return;
    }

    delete current[scopeId];

    if (Object.keys(current).length === 0) {
      localStorage.removeItem(GAME_RESULTS_LAST_UPDATED_KEY);
      return;
    }

    localStorage.setItem(GAME_RESULTS_LAST_UPDATED_KEY, JSON.stringify(current));
  } catch {
    // Ignore storage errors
  }
}
