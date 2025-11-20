import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import LoadingTitle from '../../global/LoadingTitle';
import { useGetCardPoolDeckCards } from '@/api/card-pools/useGetCardPoolDeckCards.ts';
import { useGetDeck } from '@/api/decks/useGetDeck.ts';
import { useSidebar } from '@/components/ui/sidebar.tsx';
import CPDeckFilters from '@/components/app/limited/CardPoolDeckDetail/CPDeckFilters.tsx';
import CPCardContent from '@/components/app/limited/CardPoolDeckDetail/CPCardContent.tsx';
import CPResultingDeck from '@/components/app/limited/CardPoolDeckDetail/CPResultingDeck.tsx';
import CPLeaderAndBase from '@/components/app/limited/CardPoolDeckDetail/CPLeaderAndBase.tsx';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button.tsx';
import { ArrowLeft } from 'lucide-react';

export interface DeckDetailProps {
  deckId: string | undefined;
}

const CPDeckDetail: React.FC<DeckDetailProps> = ({ deckId }) => {
  const { open: sidebarOpen, setOpen: setSidebarOpen } = useSidebar();
  // First fetch the deck to resolve its poolId
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

  const loading = isDeckFetching || isFetching;

  return (
    <>
      <Helmet title={`Deck ${deckId} | SWUBase`} />

      <div className="flex max-lg:flex-col gap-4 items-center md:justify-between">
        <LoadingTitle
          mainTitle={
            <div className="flex items-center gap-2">
              {poolId && (
                <Link to="/limited/pool/$poolId/detail" params={{ poolId }}>
                  <Button variant="ghost" size="iconSmall" aria-label="Back to pool">
                    <ArrowLeft />
                  </Button>
                </Link>
              )}
              <span>{deckData?.deck?.name}</span>
            </div>
          }
          loading={loading}
        />
      </div>

      <CPLeaderAndBase deckId={deckId} poolId={poolId} className="mb-4" />
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        <div className="col-span-1">
          <CPDeckFilters />
        </div>
        <div className="col-span-1 md:col-span-1 lg:col-span-2 xl:col-span-3">
          <CPCardContent deckId={deckId} poolId={poolId} />
        </div>
        <div className="col-span-1">
          <CPResultingDeck />
        </div>
      </div>
    </>
  );
};

export default CPDeckDetail;
