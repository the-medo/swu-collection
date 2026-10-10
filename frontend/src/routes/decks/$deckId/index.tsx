import { createFileRoute, useNavigate } from '@tanstack/react-router';
import DeckDetail from '@/components/app/decks/DeckDetail/DeckDetail.tsx';
import { deckDetailSearchSchema } from '@/components/app/decks/DeckDetail/deckDetailSearch.ts';

export const Route = createFileRoute('/decks/$deckId/')({
  component: RouteComponent,
  validateSearch: deckDetailSearchSchema,
});

function RouteComponent() {
  const { deckId } = Route.useParams();
  const { deckTab, deckArticleEdit } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  return (
    <DeckDetail
      key={deckId}
      deckId={deckId}
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
