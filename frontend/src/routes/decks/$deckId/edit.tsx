import { createFileRoute, useSearch } from '@tanstack/react-router';
import DeckDetail from '@/components/app/decks/DeckDetail/DeckDetail.tsx';
import { z } from 'zod';
import { cardSearchParams } from '@/components/app/cards/AdvancedCardSearch/advancedSearchLib.ts';
import Deckbuilder from '@/components/app/decks/Deckbuilder/Deckbuilder.tsx';

const searchParams = cardSearchParams.merge(
  z.object({
    deckbuilder: z.boolean().optional().default(false),
  }),
);

export const Route = createFileRoute('/decks/$deckId/edit')({
  component: RouteComponent,
  validateSearch: searchParams,
});

function RouteComponent() {
  const { deckbuilder } = useSearch({
    from: Route.fullPath,
  });
  const { deckId } = Route.useParams();

  if (deckbuilder) {
    return <Deckbuilder deckId={deckId} />;
  }

  return <DeckDetail adminEdit={true} deckId={deckId} deckbuilder={deckbuilder} />;
}
