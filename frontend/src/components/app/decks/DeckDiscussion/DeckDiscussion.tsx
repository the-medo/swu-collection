import DeckArticle from './DeckArticle.tsx';
import DeckComments from './DeckComments.tsx';

export default function DeckDiscussion({
  deckId,
  ownerId,
  editing,
  onEditingChange,
}: {
  deckId: string;
  ownerId: string;
  editing: boolean;
  onEditingChange?: (editing: boolean) => void;
}) {
  return (
    <section aria-label="Deck guide and comments" className="min-w-0 space-y-5">
      <DeckArticle
        deckId={deckId}
        ownerId={ownerId}
        editing={editing}
        onEditingChange={onEditingChange}
      />
      <div className="min-w-0">
        <DeckComments deckId={deckId} />
      </div>
    </section>
  );
}
