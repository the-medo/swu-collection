import { limitedStyles } from '@/components/app/limited/limitedStyles';
import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useGetCardPoolDeckCards } from '@/api/card-pools/useGetCardPoolDeckCards.ts';
import { useGetDeck } from '@/api/decks/useGetDeck.ts';
import { useSidebar } from '@/components/ui/sidebar.tsx';
import CPLeftFiltersAndPreview from '@/components/app/limited/CardPoolDeckDetail/CPLeftFiltersAndPreview/CPLeftFiltersAndPreview.tsx';
import CPPoolAndDeckSection from '@/components/app/limited/CardPoolDeckDetail/CPContent/CPPoolAndDeckSection.tsx';
import CPLeaderAndBase from '@/components/app/limited/CardPoolDeckDetail/CPLeaderAndBase/CPLeaderAndBase.tsx';
import CPTopFilters from '@/components/app/limited/CardPoolDeckDetail/CPTopFilters/CPTopFilters.tsx';
import CPDeckExplainerTooltip from '@/components/app/limited/CardPoolDeckDetail/CPDeckExplainerTooltip.tsx';
import { useGetUserSetting } from '@/api/user/useGetUserSetting.ts';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button.tsx';
import { ArrowLeft, Eye, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils.ts';
import { useCPStoreInitializator } from '@/components/app/limited/CardPoolDeckDetail/useCPStoreInitializator.ts';
import { useCPDeckKeyboardShortcuts } from '@/components/app/limited/CardPoolDeckDetail/useCPDeckKeyboardShortcuts.ts';
import {
  useCardPoolDeckDetailStore,
  useCardPoolDeckDetailStoreActions,
} from '@/components/app/limited/CardPoolDeckDetail/useCardPoolDeckDetailStore.ts';
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
  useCPDeckKeyboardShortcuts();

  const loading = isDeckFetching || isFetching;
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const { leadersAndBasesExpanded, deckView } = useCardPoolDeckDetailStore();
  const { setDeckView } = useCardPoolDeckDetailStoreActions();
  const { data: catPosition } = useGetUserSetting('cpLayout_catPosition');
  const user = useUser();
  const { owned } = useSetDeckInfo(deckId ?? '', false);

  return (
    <>
      <Helmet title={`${deckData?.deck?.name || 'Sealed deck'} | SWUBase`} />
      <div className={cn('w-full gap-2 p-2', limitedStyles.page, limitedStyles.builder)}>
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--limited-border)] pb-2">
          <div className="flex min-w-0 flex-1 items-center gap-1 max-sm:basis-full">
            <CPExpandButton
              mobileExpanded={mobileFiltersOpen}
              onMobileToggle={() => setMobileFiltersOpen(value => !value)}
            />
            {poolId && (
              <Button asChild variant="ghost" size="iconMedium">
                <Link
                  to="/limited/pool/$poolId/detail"
                  params={{ poolId }}
                  aria-label="Back to pool"
                >
                  <ArrowLeft className="size-4" />
                </Link>
              </Button>
            )}
            <h1 className={limitedStyles.title}>
              {deckData?.deck?.name || (loading ? 'Loading deck…' : 'Sealed deck')}
            </h1>
            <CPDeckExplainerTooltip />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {user && owned && deckData?.deck && (
              <>
                {deckPrivacyRenderer(deckData.deck.public)}
                <EditDeckDialog
                  deck={deckData.deck}
                  trigger={
                    <Button size="sm" variant="outline">
                      Edit deck
                    </Button>
                  }
                />
                <DeleteDeckDialog
                  deck={deckData.deck}
                  trigger={
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive max-lg:px-2"
                      aria-label="Delete deck"
                    >
                      <Trash2 className="size-4 lg:hidden" />
                      <span className="hidden lg:inline">Delete deck</span>
                    </Button>
                  }
                />
              </>
            )}
            <Button
              size="sm"
              variant="outline"
              aria-pressed={deckView}
              aria-label={deckView ? 'Back to pool' : 'Deck preview'}
              onClick={() => setDeckView(!deckView)}
            >
              {deckView ? <X className="size-4" /> : <Eye className="size-4" />}
              <span className="hidden sm:inline">{deckView ? 'Back to pool' : 'Deck preview'}</span>
            </Button>
          </div>
        </header>

        {leadersAndBasesExpanded && (
          <CPLeaderAndBase
            deckId={deckId}
            poolId={poolId}
            className="max-h-[45dvh] shrink-0 overflow-y-auto"
          />
        )}
        <div className={limitedStyles.builderWorkspace}>
          {deckView && deckId ? (
            <div className="min-h-0 min-w-0 flex-1 overflow-auto">
              <DeckViewer selectedDeckId={deckId} setSelectedDeckId={() => setDeckView(false)} />
            </div>
          ) : (
            <>
              <CPLeftFiltersAndPreview deckId={deckId} mobileExpanded={mobileFiltersOpen} />
              <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
                {(catPosition ?? 'top') === 'top' && (
                  <div className={cn('shrink-0', mobileFiltersOpen ? 'block' : 'hidden lg:block')}>
                    <CPTopFilters deckId={deckId} />
                  </div>
                )}
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
