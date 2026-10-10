import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import DeckDetail from '@/components/app/decks/DeckDetail/DeckDetail.tsx';
import { z } from 'zod';
import { cardSearchParams } from '@/components/app/cards/AdvancedCardSearch/advancedSearchLib.ts';
import Deckbuilder from '@/components/app/decks/Deckbuilder/Deckbuilder.tsx';
import { useGetDeck } from '@/api/decks/useGetDeck.ts';
import { useEffect } from 'react';
import { deckDetailSearchSchema } from '@/components/app/decks/DeckDetail/deckDetailSearch.ts';

const searchParams = cardSearchParams.merge(deckDetailSearchSchema).merge(
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
  const { deckbuilder, deckTab, deckArticleEdit } = useSearch(fromRoute);
  const navigate = useNavigate(fromRoute);

  const { data: deckInfo, isPending } = useGetDeck(deckId);

  useEffect(() => {
    if (deckInfo?.deck.cardPoolId) {
      navigate({
        search: prev => ({
          ...prev,
          deckbuilder: undefined,
        }),
      });
    }
  }, [deckInfo?.deck.cardPoolId, navigate]);

  if (isPending) return <div>Loading...</div>;

  if (deckbuilder && !deckInfo?.deck.cardPoolId) {
    return <Deckbuilder deckId={deckId} />;
  }

  return (
    <DeckDetail
      key={deckId}
      adminEdit={true}
      deckId={deckId}
      deckbuilder={deckbuilder}
      tab={deckTab ?? 'decklist'}
      onTabChange={tab => {
        void navigate({
          resetScroll: false,
          search: previous => ({
            ...previous,
            deckTab: tab === 'decklist' ? undefined : tab,
            deckArticleEdit: undefined,
            deckComment: undefined,
          }),
        });
      }}
      articleEditing={deckArticleEdit ?? false}
      onArticleEditingChange={editing => {
        void navigate({
          resetScroll: false,
          replace: true,
          search: previous => ({ ...previous, deckArticleEdit: editing || undefined }),
        });
      }}
    />
  );
}
