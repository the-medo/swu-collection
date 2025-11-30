import React, { useMemo } from 'react';
import { CardPool } from '../../../../../../server/db/schema/card_pool.ts';
import { useGetCardPoolDecks } from '@/api/card-pools/useGetCardPoolDecks.ts';
import CreateDeckSection from './CreateDeckSection.tsx';
import DeckCard from './DeckCard.tsx';
import { useUser } from '@/hooks/useUser.ts';

export interface DecksColumnProps {
  pool?: CardPool;
}

const DecksColumn: React.FC<DecksColumnProps> = ({ pool }) => {
  const { data, isFetching, isError } = useGetCardPoolDecks({ id: pool?.id });
  const user = useUser();

  const decks = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap(page => page?.data ?? []);
  }, [data]);

  const { yourDecks, otherDecks } = useMemo(() => {
    if (!user) return { yourDecks: decks, otherDecks: [] as typeof decks };
    const yd = decks.filter(d => d.user?.id === user.id);
    const od = decks.filter(d => d.user?.id !== user.id);
    return { yourDecks: yd, otherDecks: od };
  }, [decks, user]);

  const noDecks = !isFetching && !isError && decks.length === 0;

  return (
    <div className="h-full rounded-lg border border-border bg-card p-3">
      <h3 className="text-sm font-semibold mb-2">Decks</h3>
      <CreateDeckSection pool={pool} className="mb-3" />
      {isFetching && <div className="text-xs opacity-60">Loading decks...</div>}
      {isError && <div className="text-xs text-red-400">Failed to load decks.</div>}
      {noDecks && (
        <div className="text-xs opacity-60">No public decks created for this pool yet.</div>
      )}

      {!isFetching && !isError && decks.length > 0 && (
        <>
          {!user && (
            <div className="flex flex-wrap gap-2">
              {decks.map(item => (
                <DeckCard key={item.deck.id} deck={item.deck} />
              ))}
            </div>
          )}

          {user && (
            <div className="flex flex-col gap-3">
              {yourDecks.length > 0 && (
                <div>
                  <h5>Your decks</h5>
                  <div className="flex flex-wrap gap-2">
                    {yourDecks.map(item => (
                      <DeckCard key={item.deck.id} deck={item.deck} />
                    ))}
                  </div>
                </div>
              )}

              {otherDecks.length > 0 && (
                <div>
                  <h5>Other decks</h5>
                  <div className="flex flex-wrap gap-2">
                    {otherDecks.map(item => (
                      <DeckCard key={item.deck.id} deck={item.deck} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DecksColumn;
