import { useMemo } from 'react';
import { useGetDecks } from '@/api/decks/useGetDecks.ts';
import DeckTable from '@/components/app/decks/DeckTable/DeckTable.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Loader2 } from 'lucide-react';
import DeckFilters from '@/components/app/decks/DeckFilters/DeckFilters.tsx';
import {
  useDeckFilterStore,
  useInitializeDeckFilterFromUrlParams,
} from '@/components/app/decks/DeckFilters/useDeckFilterStore.ts';
import { User } from '../../../../../../types/User.ts';
import { Deck } from '../../../../../../types/Deck.ts';

export type UserDeckData = {
  user: User;
  deck: Deck;
};

interface PublicDecksProps {}

const PublicDecks: React.FC<PublicDecksProps> = ({}) => {
  const initialized = useInitializeDeckFilterFromUrlParams({});
  const { toRequestParams } = useDeckFilterStore({});

  const { data, isFetching, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useGetDecks(toRequestParams());

  const decks: UserDeckData[] = useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap(page => page.data || []);
  }, [data]);

  const loading = isFetching && !isFetchingNextPage;

  if (!initialized) {
    return (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading{' '}
      </>
    );
  }

  return (
    <>
      <DeckFilters initialized={initialized} />
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
