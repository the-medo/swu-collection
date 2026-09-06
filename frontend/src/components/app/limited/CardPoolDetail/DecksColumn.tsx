import React, { useMemo } from 'react';
import type { CardPoolWithDeckState } from '@/api/card-pools/useGetCardPool.ts';
import { useGetCardPoolDecks } from '@/api/card-pools/useGetCardPoolDecks.ts';
import CreateDeckSection from './CreateDeckSection.tsx';
import DeckCard from './DeckCard.tsx';
import { useUser } from '@/hooks/useUser.ts';
import EditCustomPoolCardsSection from './EditCustomPoolCardsSection.tsx';
import { Alert } from '@/components/ui/alert.tsx';
import { TriangleAlert } from 'lucide-react';

export interface DecksColumnProps {
  pool?: CardPoolWithDeckState;
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
  const canManageCustomPool = Boolean(user && pool?.custom && user.id === pool.userId);

  return (
    <div className="h-full rounded-lg border border-border bg-card p-3">
      <h3 className="text-sm font-semibold mb-2">Decks</h3>
      <CreateDeckSection pool={pool} className="mb-3" />
      {pool && canManageCustomPool && (
        <>
          <EditCustomPoolCardsSection pool={pool} />
          <Alert variant="warning" size="xs" className="mb-3 items-start">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
            <span>
              {pool.hasDecks
                ? 'This pool has a deck, so its card list can no longer be changed.'
                : 'You can update this pool only while it has no decks. Creating a deck will lock its card list.'}
            </span>
          </Alert>
        </>
      )}
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
