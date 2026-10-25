import { browseStyles } from '@/components/app/global/BrowsePage/browseStyles';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';
import { useGetDecks } from '@/api/decks/useGetDecks.ts';
import DeckTable from '@/components/app/decks/DeckTable/DeckTable.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Loader2 } from 'lucide-react';
import DeckFiltersAccordion from '@/components/app/decks/DeckFilters/DeckFiltersAccordion.tsx';
import { useSidebar } from '@/components/ui/sidebar.tsx';
import {
  useDeckFilterStore,
  useInitializeDeckFilterFromUrlParams,
} from '@/components/app/decks/DeckFilters/useDeckFilterStore.ts';
import { User } from '../../../../../../types/User.ts';
import { Deck } from '../../../../../../types/Deck.ts';
import { BrowseEmpty } from '@/components/app/global/BrowsePage/BrowsePage.tsx';
import { DeckIcon } from '@/components/app/global/icons/CardLibraryIcons.tsx';

export type UserDeckData = {
  user: User;
  deck: Deck;
};

interface PublicDecksProps {}

const PublicDecks: React.FC<PublicDecksProps> = ({}) => {
  const { isMobile } = useSidebar();
  const initialized = useInitializeDeckFilterFromUrlParams();
  const { toRequestParams } = useDeckFilterStore();

  const { data, isFetching, hasNextPage, fetchNextPage, isFetchingNextPage, isError, refetch } =
    useGetDecks(toRequestParams());

  const decks: UserDeckData[] = useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap(page => page.data || []);
  }, [data]);

  const loading = isFetching && !data;

  if (!initialized) {
    return (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading{' '}
      </>
    );
  }

  return (
    <>
      <DeckFiltersAccordion
        key={isMobile ? 'mobile' : 'desktop'}
        defaultOpen={!isMobile}
        initialized={initialized}
      />
      {isError ? (
        <div role="alert" className={cn('flex flex-wrap items-center gap-4', browseStyles.panel)}>
          Could not load the decks.
          <Button variant="outline" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      ) : !loading && decks.length === 0 ? (
        <BrowseEmpty icon={DeckIcon} title="No decks match these filters">
          Try another leader, base, or format, or reset your filters to see more builds.
        </BrowseEmpty>
      ) : (
        <DeckTable variant="public" decks={decks} loading={loading} />
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

export default PublicDecks;
