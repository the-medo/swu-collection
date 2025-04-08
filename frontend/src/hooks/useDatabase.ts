import { useEffect, useState } from 'react';
import { db } from '@/lib/db';

export function useDatabase() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Open the database connection when the hook is first used
    const initDb = async () => {
      try {
        await db.open();
        setIsReady(true);
      } catch (err) {
        console.error('Failed to open database', err);
        setError(err instanceof Error ? err : new Error('Unknown database error'));
      }
    };

    initDb();

    return () => {
      db.close();
    };
  }, []);

  return { isReady, error };
}
