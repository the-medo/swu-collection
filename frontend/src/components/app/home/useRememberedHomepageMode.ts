import { useCallback, useEffect, useState } from 'react';
import { homepageModes, type HomepageMode } from '../../../../../shared/types/homepage.ts';

export const HOMEPAGE_MODE_STORAGE_KEY = 'swubase.homepage-mode';

function readHomepageMode(): HomepageMode | undefined {
  try {
    const value = window.localStorage.getItem(HOMEPAGE_MODE_STORAGE_KEY);
    return homepageModes.find(mode => mode === value);
  } catch {
    return undefined;
  }
}

/** Last selected mode in this browser; account settings remain the default for a new browser. */
export function useRememberedHomepageMode() {
  const [mode, setMode] = useState(readHomepageMode);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === HOMEPAGE_MODE_STORAGE_KEY || event.key === null) {
        setMode(readHomepageMode());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const rememberMode = useCallback((next: HomepageMode) => {
    setMode(next);
    try {
      window.localStorage.setItem(HOMEPAGE_MODE_STORAGE_KEY, next);
    } catch {
      // Navigation still works when the browser blocks persistent storage.
    }
  }, []);

  return [mode, rememberMode] as const;
}
