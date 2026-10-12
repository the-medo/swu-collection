import { useCallback, useEffect, useState } from 'react';

export type TournamentLayout = 'boxes' | 'rows';
export const TOURNAMENT_LAYOUT_STORAGE_KEY = 'swubase.live-tournament-layout';

function readLayout(): TournamentLayout {
  try {
    return window.localStorage.getItem(TOURNAMENT_LAYOUT_STORAGE_KEY) === 'rows' ? 'rows' : 'boxes';
  } catch {
    return 'boxes';
  }
}

export function useTournamentLayout() {
  const [layout, setLayout] = useState(readLayout);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === TOURNAMENT_LAYOUT_STORAGE_KEY || event.key === null)
        setLayout(readLayout());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const rememberLayout = useCallback((next: TournamentLayout) => {
    setLayout(next);
    try {
      window.localStorage.setItem(TOURNAMENT_LAYOUT_STORAGE_KEY, next);
    } catch {
      // The switch still works when persistent storage is unavailable.
    }
  }, []);

  return [layout, rememberLayout] as const;
}
