import { useGetDecksForCard } from '@/api/decks/useGetDecksForCard.ts';
import DeckTable from '@/components/app/decks/DeckTable/DeckTable.tsx';
import { Button } from '@/components/ui/button.tsx';

export default function CardDetailDecks({ cardId }: { cardId: string }) {
  const { data, isFetching, isError, refetch } = useGetDecksForCard(cardId);

  return (
    <section aria-label="Decks with this card" className="min-w-0 space-y-3">
      {isError && (
        <div className="space-y-2" role="alert">
          <p className="text-sm text-destructive">
            Unable to load decks with this card. Please try again.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            {isFetching ? 'Retrying...' : 'Retry'}
          </Button>
        </div>
      )}
      {isFetching && !data && (
        <p role="status" className="text-sm text-muted-foreground">
          Loading decks...
        </p>
      )}
      {data?.length === 0 && (
        <p role="status" className="text-sm text-muted-foreground">
          No public decks with this card yet.
        </p>
      )}
      {(data?.length || (isFetching && !data)) && (
        <div
          role="region"
          aria-label="Public decks"
          tabIndex={0}
          className="max-w-full overflow-x-auto rounded-md"
        >
          <DeckTable variant="public" decks={data ?? []} loading={isFetching && !data} />
        </div>
      )}
    </section>
  );
}
