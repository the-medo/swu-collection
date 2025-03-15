import DeckTable from '../DeckTable/DeckTable.tsx';
import { useEffect, useMemo, useState } from 'react';
import { UserDeckData } from '../DeckTable/deckTableLib.tsx';
import DeckFiltersAccordion from '@/components/app/decks/DeckFilters/DeckFiltersAccordion.tsx';
import {
  useDeckFilterStore,
  useInitializeDeckFilterFromUrlParams,
} from '@/components/app/decks/DeckFilters/useDeckFilterStore.ts';
import { GetDecksRequest, useGetDecks } from '@/api/decks/useGetDecks.ts';
import { Button } from '@/components/ui/button.tsx';
import { Loader2 } from 'lucide-react';

interface UserDecksProps {
  userId: string | undefined;
  loading?: boolean;
}

const UserDecks: React.FC<UserDecksProps> = ({ userId, loading = false }) => {
  const initialized = useInitializeDeckFilterFromUrlParams();
  const { toRequestParams } = useDeckFilterStore();
  const [filters, setFilters] = useState<GetDecksRequest>({});

  useEffect(() => {
    if (!initialized) return;
    setTimeout(() => {
      setFilters(toRequestParams(userId));
    }, 50);
  }, [userId, initialized, toRequestParams]);

  const { data, isFetching, hasNextPage, fetchNextPage, isFetchingNextPage } = useGetDecks(filters);

  const decks: UserDeckData[] = useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap(page => page.data || []);
  }, [data]);

  const isLoading = isFetching || loading;

  return (
    <>
      <DeckFiltersAccordion initialized={initialized} />
      <DeckTable variant="user" decks={decks} loading={isLoading} />

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

export default UserDecks;
