import React, { createContext, useContext } from 'react';
import { useDatabase } from '@/hooks/useDatabase';
import { Loader2 } from 'lucide-react';

type DatabaseContextType = {
  isReady: boolean;
  error: Error | null;
};

const DatabaseContext = createContext<DatabaseContextType>({
  isReady: false,
  error: null,
});

export const useDbContext = () => useContext(DatabaseContext);

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const { isReady, error } = useDatabase();

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4">
        <div className="bg-destructive/10 p-4 rounded-md border border-destructive max-w-md">
          <h2 className="text-xl font-bold text-destructive mb-2">Database Error</h2>
          <p className="text-destructive">{error.message}</p>
          <p className="mt-4 text-sm">
            Please refresh the page or clear your browser storage if the issue persists.
          </p>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
        <p className="text-muted-foreground">Initializing database...</p>
      </div>
    );
  }

  return <DatabaseContext.Provider value={{ isReady, error }}>{children}</DatabaseContext.Provider>;
}
