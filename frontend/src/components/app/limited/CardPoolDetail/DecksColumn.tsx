import { limitedStyles } from '@/components/app/limited/limitedStyles';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';
import type { CardPoolWithDeckState } from '@/api/card-pools/useGetCardPool.ts';
import { useGetCardPoolDecks } from '@/api/card-pools/useGetCardPoolDecks.ts';
import CreateDeckSection from './CreateDeckSection.tsx';
import DeckCard from './DeckCard.tsx';
import { useUser } from '@/hooks/useUser.ts';
import EditCustomPoolCardsSection from './EditCustomPoolCardsSection.tsx';
import { Alert } from '@/components/ui/alert.tsx';
import { Button } from '@/components/ui/button.tsx';
import { TriangleAlert } from 'lucide-react';
import { DeckIcon } from '@/components/app/global/icons/CardLibraryIcons.tsx';
import { Visibility } from '../../../../../../shared/types/visibility.ts';

export interface DecksColumnProps {
  pool?: CardPoolWithDeckState;
  initialDeckVisibility?: Visibility;
}

export default function DecksColumn({ pool, initialDeckVisibility }: DecksColumnProps) {
  const defaultVisibility =
    initialDeckVisibility ?? (pool?.visibility as Visibility | null) ?? Visibility.Unlisted;
  const { data, isPending, isError, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useGetCardPoolDecks({ id: pool?.id });
  const user = useUser();
  const decks = useMemo(() => data?.pages.flatMap(page => page?.data ?? []) ?? [], [data]);
  const yourDecks = user ? decks.filter(item => item.user?.id === user.id) : [];
  const otherDecks = user ? decks.filter(item => item.user?.id !== user.id) : decks;
  const canManageCustomPool = Boolean(user && pool?.custom && user.id === pool.userId);

  return (
    <div className={cn('space-y-4', limitedStyles.decksColumn)}>
      <CreateDeckSection
        key={`${pool?.id}:${defaultVisibility}`}
        pool={pool}
        initialVisibility={defaultVisibility}
      />
      {pool && canManageCustomPool && (
        <div className={cn('p-3', limitedStyles.panel)}>
          <EditCustomPoolCardsSection pool={pool} />
          <Alert variant="warning" size="xs" className="items-start">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
            <span>
              {pool.hasDecks
                ? 'This pool has a deck, so its card list can no longer be changed.'
                : 'You can update this pool only while it has no decks. Creating a deck will lock its card list.'}
            </span>
          </Alert>
        </div>
      )}
      {isPending && (
        <div role="status" className="text-xs text-muted-foreground">
          Loading decks…
        </div>
      )}
      {isError && (
        <div role="alert" className="text-xs">
          Could not load decks.{' '}
          <Button size="xs" variant="outline" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      )}
      {!isPending && data && (
        <>
          {user && (
            <section aria-labelledby="pool-your-decks-heading">
              <h2
                id="pool-your-decks-heading"
                className={cn(
                  limitedStyles.heading,
                  'mb-2! flex items-center justify-between gap-2',
                )}
              >
                Your decks{' '}
                <span className="rounded-md bg-[var(--limited-soft)] px-2 py-0.5 text-xs text-[var(--limited-accent)]">
                  {yourDecks.length}
                  {hasNextPage ? '+' : ''}
                </span>
              </h2>
              <div className="grid gap-2">
                {yourDecks.map(item => (
                  <DeckCard key={item.deck.id} deck={item.deck} />
                ))}
                {!yourDecks.length && (
                  <div className="flex items-start gap-2 rounded-xl border border-dashed border-[var(--limited-border)] p-3 text-muted-foreground">
                    <DeckIcon size={24} className="shrink-0" />
                    <p className="m-0! text-xs leading-relaxed">
                      {hasNextPage
                        ? 'Load more to see earlier builds, or start a new deck above.'
                        : 'Your builds will live here. Start a deck above and try out a leader.'}
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}
          {(otherDecks.length > 0 || !user) && (
            <section aria-labelledby="pool-community-decks-heading">
              <h2 id="pool-community-decks-heading" className={cn(limitedStyles.heading, 'mb-2!')}>
                {user ? 'Other decks' : 'Decks from this pool'}
              </h2>
              <div className="grid gap-2">
                {otherDecks.map(item => (
                  <DeckCard
                    key={item.deck.id}
                    deck={item.deck}
                    author={item.user?.displayName || item.user?.name}
                  />
                ))}
                {!otherDecks.length && (
                  <p className="m-0! rounded-xl border border-dashed border-[var(--limited-border)] p-3 text-xs text-muted-foreground">
                    No public builds yet. Try your take on this pool.
                  </p>
                )}
              </div>
            </section>
          )}
          {hasNextPage && (
            <Button
              className="w-full"
              variant="outline"
              size="sm"
              disabled={isFetchingNextPage}
              onClick={() => void fetchNextPage()}
            >
              {isFetchingNextPage ? 'Loading…' : 'Load more decks'}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
