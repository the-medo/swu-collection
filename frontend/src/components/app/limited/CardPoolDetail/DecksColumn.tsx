import React, { useMemo } from 'react';
import { CardPool } from '../../../../../../server/db/schema/card_pool.ts';
import { useGetCardPoolDecks } from '@/api/card-pools/useGetCardPoolDecks.ts';
import CreateDeckSection from './CreateDeckSection.tsx';

export interface DecksColumnProps {
  pool?: CardPool;
}

const DecksColumn: React.FC<DecksColumnProps> = ({ pool }) => {
  const { data, isFetching, isError } = useGetCardPoolDecks({ id: pool?.id });

  const decks = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap(page => page?.data ?? []);
  }, [data]);

  return (
    <div className="h-full rounded-lg border border-border bg-card p-3">
      <h3 className="text-sm font-semibold mb-2">Decks</h3>
      <CreateDeckSection pool={pool} className="mb-3" />
      {isFetching && <div className="text-xs opacity-60">Loading decks...</div>}
      {isError && <div className="text-xs text-red-400">Failed to load decks.</div>}
      {!isFetching && !isError && decks.length === 0 && (
        <div className="text-xs opacity-60">No decks created for this pool yet.</div>
      )}
      {!isFetching && !isError && decks.length > 0 && (
        <pre className="text-[10px] leading-tight whitespace-pre-wrap break-words">
          {JSON.stringify(decks, null, 2)}
        </pre>
      )}
    </div>
  );
};

export default DecksColumn;
