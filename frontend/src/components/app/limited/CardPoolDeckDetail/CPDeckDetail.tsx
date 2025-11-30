import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import LoadingTitle from '../../global/LoadingTitle';
import { useGetCardPoolDeckCards } from '@/api/card-pools/useGetCardPoolDeckCards.ts';
import { useGetDeck } from '@/api/decks/useGetDeck.ts';
import { useSidebar } from '@/components/ui/sidebar.tsx';
import CPLeftFiltersAndPreview from '@/components/app/limited/CardPoolDeckDetail/CPLeftFiltersAndPreview/CPLeftFiltersAndPreview.tsx';
import CPPoolAndDeckSection from '@/components/app/limited/CardPoolDeckDetail/CPContent/CPPoolAndDeckSection.tsx';
import CPLeaderAndBase from '@/components/app/limited/CardPoolDeckDetail/CPLeaderAndBase/CPLeaderAndBase.tsx';
import CPTopFilters from '@/components/app/limited/CardPoolDeckDetail/CPTopFilters/CPTopFilters.tsx';
import { useGetUserSetting } from '@/api/user/useGetUserSetting.ts';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button.tsx';
import { ArrowLeft, Eye, X } from 'lucide-react';
import { useCPStoreInitializator } from '@/components/app/limited/CardPoolDeckDetail/useCPStoreInitializator.ts';
import {
  useCardPoolDeckDetailStore,
  useCardPoolDeckDetailStoreActions,
} from '@/components/app/limited/CardPoolDeckDetail/useCardPoolDeckDetailStore.ts';
import { cn } from '@/lib/utils.ts';
import { CPExpandButton } from '@/components/app/limited/CardPoolDeckDetail/CPLeftFiltersAndPreview/CPExpandButton.tsx';
import DeckViewer from '@/components/app/tournaments/TournamentTopBracket/components/DeckViewer.tsx';
import { useUser } from '@/hooks/useUser';
import EditDeckDialog from '@/components/app/dialogs/EditDeckDialog';
import DeleteDeckDialog from '@/components/app/dialogs/DeleteDeckDialog';
import { deckPrivacyRenderer } from '@/lib/table/deckPrivacyRenderer.tsx';
import { useSetDeckInfo } from '@/components/app/decks/DeckContents/useDeckInfoStore.ts';

export interface DeckDetailProps {
  deckId: string | undefined;
}

const CPDeckDetail: React.FC<DeckDetailProps> = ({ deckId }) => {
  const { open: sidebarOpen, setOpen: setSidebarOpen } = useSidebar();
  const { data: deckData, isFetching: isDeckFetching } = useGetDeck(deckId);
  const poolId = deckData?.deck?.cardPoolId ?? undefined;

  // Then fetch the deck cards for the resolved pool
  const { isFetching } = useGetCardPoolDeckCards(poolId, deckId);

  useEffect(() => {
    setSidebarOpen(false);
    return () => {
      setSidebarOpen(sidebarOpen);
    };
  }, []);

  useCPStoreInitializator(deckId);

  const loading = isDeckFetching || isFetching;
  const { leadersAndBasesExpanded, deckView } = useCardPoolDeckDetailStore();
  const { setDeckView } = useCardPoolDeckDetailStoreActions();
  const { data: catPosition } = useGetUserSetting('cpLayout_catPosition');
  const user = useUser();
  const { owned } = useSetDeckInfo(deckId ?? '', false);

  return (
    <>
      <Helmet title={`Deck ${deckId} | SWUBase`} />
      <div className=" max-h-[calc(100vh)] overflow-y-auto w-full">
        <div className="flex max-lg:flex-col gap-4 items-center md:justify-between">
          <LoadingTitle
            mainTitle={
              <div className="flex items-center gap-2 w-full">
                <div className="border-0 border-r pr-2 border">
                  <CPExpandButton />
                </div>
                {poolId && (
                  <Link to="/limited/pool/$poolId/detail" params={{ poolId }}>
                    <Button variant="ghost" size="sm" aria-label="Back to pool">
                      <ArrowLeft />
                    </Button>
                  </Link>
                )}
                <span>{deckData?.deck?.name}</span>
              </div>
            }
            loading={loading}
          />
          {user && (
            <div className="flex flex-row gap-2 items-center">
              {owned && deckData?.deck && (
                <>
                  {deckPrivacyRenderer(deckData?.deck.public)}
                  <EditDeckDialog deck={deckData?.deck} trigger={<Button>Edit deck</Button>} />
                  <DeleteDeckDialog
                    deck={deckData?.deck}
                    trigger={<Button variant="destructive">Delete deck</Button>}
                  />
                </>
              )}
              <Button variant="outline" onClick={() => setDeckView(!deckView)}>
                {deckView ? <X /> : <Eye />}
              </Button>
            </div>
          )}
        </div>

        {leadersAndBasesExpanded && (
          <CPLeaderAndBase deckId={deckId} poolId={poolId} className="mb-2" />
        )}
        <div
          className={cn('flex flex-row gap-2 pt-2', {
            'h-[calc(100vh-165px)]': leadersAndBasesExpanded,
            'h-[calc(100vh-60px)]': !leadersAndBasesExpanded,
          })}
        >
          {deckView && deckId ? (
            <DeckViewer selectedDeckId={deckId} setSelectedDeckId={_id => setDeckView(false)} />
          ) : (
            <>
              <CPLeftFiltersAndPreview deckId={deckId} />
              <div className=" flex flex-1 flex-col gap-2">
                {(catPosition ?? 'top') === 'top' && <CPTopFilters deckId={deckId} />}
                <CPPoolAndDeckSection deckId={deckId} poolId={poolId} />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default CPDeckDetail;
