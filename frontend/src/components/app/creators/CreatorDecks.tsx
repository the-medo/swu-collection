import { useCreatorDecks } from '@/api/creators/useCreatorFeed.ts';
import DeckTable from '@/components/app/decks/DeckTable/DeckTable.tsx';
import { Status } from './CreatorControls.tsx';
import { CreatorLoadMore } from './CreatorLoadMore.tsx';
import { Button } from '@/components/ui/button.tsx';

export function CreatorDecks({ creatorId }: { creatorId: string }) {
  const query = useCreatorDecks(creatorId);
  const decks = [
    ...new Map(
      query.data?.pages.flatMap(page => page.items).map(row => [row.deck.id, row]) ?? [],
    ).values(),
  ];
  return (
    <section
      className="min-w-0 space-y-4"
      aria-label="Creator decks"
      data-creator-scroll-pending={query.isPending}
    >
      <Status loading={query.isPending} error={!query.isFetchNextPageError ? query.error : null} />
      {query.isError && !query.data && (
        <Button variant="outline" onClick={() => void query.refetch()}>
          Try again
        </Button>
      )}
      {query.data && decks.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No public decks linked to this creator’s published content yet.
        </p>
      ) : (
        <DeckTable variant="public" decks={decks} loading={query.isPending} />
      )}
      {query.data && (
        <CreatorLoadMore
          hasMore={query.hasNextPage}
          loading={query.isFetching}
          error={query.isFetchNextPageError}
          onLoad={() => void query.fetchNextPage()}
          label="decks"
        />
      )}
    </section>
  );
}
