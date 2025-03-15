import { useMemo, useEffect } from 'react';
import { useGetDecks } from '@/api/decks/useGetDecks.ts';
import DeckTable from '@/components/app/decks/DeckTable/DeckTable.tsx';
import { UserDeckData } from '@/api/user/useGetUserDecks.ts';
import { Button } from '@/components/ui/button.tsx';
import { Loader2 } from 'lucide-react';
import DeckFilters from '@/components/app/decks/DeckFilters/DeckFilters.tsx';
import { useDeckFilterStore } from '@/components/app/decks/DeckFilters/useDeckFilterStore.ts';

interface PublicDecksProps {}

const PublicDecks: React.FC<PublicDecksProps> = ({}) => {
  const { toRequestParams } = useDeckFilterStore();

  const filters = useMemo(() => toRequestParams(), [toRequestParams]);

  const { data, isFetching, hasNextPage, fetchNextPage, isFetchingNextPage, refetch } =
    useGetDecks(filters);

  useEffect(() => {
    refetch();
  }, [filters, refetch]);

  const decks: UserDeckData[] = useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap(page => page.data || []);
  }, [data]);

  const loading = isFetching && !isFetchingNextPage;

  return (
    <>
      <DeckFilters filters={filters} onFiltersChange={() => {}} />
      <DeckTable variant="public" decks={decks} loading={loading} />

      {hasNextPage && (
        <div className="flex justify-center mt-4">
          <Button onClick={() => fetchNextPage()} disabled={isFetchingNextPage} variant="outline">
            {isFetchingNextPage ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading more
              </>
            ) : (
              'Load more decks'
            )}
          </Button>
        </div>
      )}
    </>
  );
};

export default PublicDecks;
