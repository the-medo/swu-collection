import { browseStyles } from '@/components/app/global/BrowsePage/browseStyles';
import { cn } from '@/lib/utils';
import DeckTable from '../DeckTable/DeckTable.tsx';
import { useMemo } from 'react';
import { UserDeckData } from '../DeckTable/deckTableLib.tsx';
import DeckFiltersAccordion from '@/components/app/decks/DeckFilters/DeckFiltersAccordion.tsx';
import {
  useDeckFilterStore,
  useInitializeDeckFilterFromUrlParams,
} from '@/components/app/decks/DeckFilters/useDeckFilterStore.ts';
import { useGetDecks } from '@/api/decks/useGetDecks.ts';
import { Button } from '@/components/ui/button.tsx';
import { Loader2, Star } from 'lucide-react';
import { BrowseEmpty } from '@/components/app/global/BrowsePage/BrowsePage.tsx';

interface FavoriteDecksProps {
  loading?: boolean;
}

const FavoriteDecks: React.FC<FavoriteDecksProps> = ({ loading = false }) => {
  const initialized = useInitializeDeckFilterFromUrlParams();
  const { toRequestParams } = useDeckFilterStore();

  const { data, isFetching, hasNextPage, fetchNextPage, isFetchingNextPage, isError, refetch } =
    useGetDecks(toRequestParams(undefined, true));

  const decks: UserDeckData[] = useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap(page => page.data || []);
  }, [data]);

  const isLoading = isFetching || loading;

  if (!initialized) {
    return (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading{' '}
      </>
    );
  }

  return (
    <>
      <DeckFiltersAccordion initialized={initialized} />
      {isError ? (
        <div role="alert" className={cn('flex flex-wrap items-center gap-4', browseStyles.panel)}>
          Could not load your favorites.
          <Button variant="outline" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      ) : !isLoading && decks.length === 0 ? (
        <BrowseEmpty icon={Star} title="Keep your favorite builds close">
          Star a deck to save it here. If you have filters selected, try clearing them.
        </BrowseEmpty>
      ) : (
        <DeckTable variant="public" decks={decks} loading={isLoading} />
      )}

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

export default FavoriteDecks;
