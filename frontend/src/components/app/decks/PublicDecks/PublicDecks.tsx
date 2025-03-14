import { useMemo, useState } from 'react';
import { GetDecksRequest, useGetDecks } from '@/api/decks/useGetDecks.ts';
import DeckTable from '@/components/app/decks/DeckTable/DeckTable.tsx';
import { UserDeckData } from '@/api/user/useGetUserDecks.ts';
import { Button } from '@/components/ui/button.tsx';
import { Loader2 } from 'lucide-react';
import DeckFilters from '@/components/app/decks/DeckFilters/DeckFilters.tsx';

interface PublicDecksProps {}

const PublicDecks: React.FC<PublicDecksProps> = ({}) => {
  const [filters, setFilters] = useState<GetDecksRequest>({});

  const { data, isFetching, hasNextPage, fetchNextPage, isFetchingNextPage } = useGetDecks(filters);

  const decks: UserDeckData[] = useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap(page => page.data || []);
  }, [data]);

  const loading = isFetching && !isFetchingNextPage;

  return (
    <>
      <DeckFilters filters={filters} onFiltersChange={setFilters} />
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
