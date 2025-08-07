import { useEffect, useState } from 'react';
import { db } from '@/dexie';

export function useDatabase() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Open the database connection when the hook is first used
    const initDb = async () => {
      try {
        // Check if the database is already open
        if (!db.isOpen()) {
          await db.open();
        }
        setIsReady(true);
      } catch (err) {
        console.error('Failed to open database', err);
        setError(err instanceof Error ? err : new Error('Unknown database error'));
      }
    };

    initDb();

    // Don't close the database connection when unmounting - keep it open for the app lifecycle
    return () => {
      // Don't close the database when the component unmounts
      // This avoids the "Database has been closed" error
    };
  }, []);

  return { isReady, error };
}
