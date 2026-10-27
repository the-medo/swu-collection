import { browseStyles } from '@/components/app/global/BrowsePage/browseStyles';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';
import { useUser } from '@/hooks/useUser.ts';
import SignIn from '@/components/app/auth/SignIn.tsx';
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

interface PublicDecksProps {
  following?: boolean;
}

const PublicDecks: React.FC<PublicDecksProps> = ({ following = false }) => {
  const user = useUser();
  const { isMobile } = useSidebar();
  const initialized = useInitializeDeckFilterFromUrlParams();
  const { toRequestParams } = useDeckFilterStore();

  const { data, isFetching, hasNextPage, fetchNextPage, isFetchingNextPage, error, refetch } =
    useGetDecks({ ...toRequestParams(), following: following || undefined });

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
      {error ? (
        <div role="alert" className={cn('flex flex-wrap items-center gap-4', browseStyles.panel)}>
          {error.message}
          <Button variant="outline" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      ) : following && !user ? (
        <div className={cn('grid justify-items-start gap-3', browseStyles.panel)}>
          <p className="text-muted-foreground">
            Sign in to see public decks from users you follow.
          </p>
          <SignIn buttonText="Sign in" forceTextButton />
        </div>
      ) : following && !loading && decks.length === 0 ? (
        <BrowseEmpty
          icon={DeckIcon}
          title="No public decks from your follows match these filters yet."
        >
          Follow users or broaden your filters to see more builds.
        </BrowseEmpty>
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
