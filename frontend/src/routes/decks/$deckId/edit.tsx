import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import DeckDetail from '@/components/app/decks/DeckDetail/DeckDetail.tsx';
import { z } from 'zod';
import { cardSearchParams } from '@/components/app/cards/AdvancedCardSearch/advancedSearchLib.ts';
import Deckbuilder from '@/components/app/decks/Deckbuilder/Deckbuilder.tsx';
import { useGetDeck } from '@/api/decks/useGetDeck.ts';
import { useEffect } from 'react';

const searchParams = cardSearchParams.merge(
  z.object({
    deckbuilder: z.boolean().optional().default(false),
  }),
);

export const Route = createFileRoute('/decks/$deckId/edit')({
  component: RouteComponent,
  validateSearch: searchParams,
});

const fromRoute = {
  from: Route.fullPath,
};

function RouteComponent() {
  const { deckId } = Route.useParams();
  const { deckbuilder } = useSearch(fromRoute);
  const navigate = useNavigate(fromRoute);

  const { data: deckInfo, isLoading } = useGetDeck(deckId);

  useEffect(() => {
    if (deckInfo?.deck.cardPoolId) {
      navigate({
        search: prev => ({
          ...prev,
          deckbuilder: undefined,
        }),
      });
    }
  }, [deckInfo?.deck.cardPoolId]);

  if (isLoading) return <div>Loading...</div>;

  if (deckbuilder && !deckInfo?.deck.cardPoolId) {
    return <Deckbuilder deckId={deckId} />;
  }

  return <DeckDetail adminEdit={true} deckId={deckId} deckbuilder={deckbuilder} />;
}
