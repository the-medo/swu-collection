import { createFileRoute } from '@tanstack/react-router';
import DeckBrowsePage from '@/components/app/decks/DeckBrowsePage.tsx';
import { z } from 'zod';
import { booleanPreprocessor } from '../../../../shared/lib/zod/booleanPreprocessor.ts';

export const Route = createFileRoute('/decks/public')({
  validateSearch: z.object({ deckFollowing: booleanPreprocessor.optional().catch(undefined) }),
  component: PagePublicDecks,
});

function PagePublicDecks() {
  const { deckFollowing } = Route.useSearch();
  return <DeckBrowsePage scope="public" following={!!deckFollowing} />;
}
