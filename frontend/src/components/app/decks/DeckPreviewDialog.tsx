import { lazy, Suspense, type ReactNode } from 'react';
import { useGetDeck } from '@/api/decks/useGetDeck.ts';
import Dialog from '@/components/app/global/Dialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import { useSetDeckInfo } from './DeckContents/useDeckInfoStore.ts';

const DeckContents = lazy(() => import('./DeckContents/DeckContents.tsx'));

// This subtree only mounts when the dialog opens; browsing rows loads metadata only.
function Preview({ deckId, compact }: { deckId: string; compact: boolean }) {
  const { data, error, loading } = useSetDeckInfo(deckId);
  const query = useGetDeck(deckId);
  if (error)
    return (
      <div role="alert" className="space-y-3 p-3">
        <p>
          {error.status === 404 ? 'This deck is no longer available.' : 'Could not load this deck.'}
        </p>
        <Button variant="outline" onClick={() => void query.refetch()}>
          Try again
        </Button>
      </div>
    );
  if (!data || loading)
    return (
      <p role="status" className="p-3">
        Loading decklist…
      </p>
    );
  return (
    <Suspense fallback={<p role="status">Loading decklist…</p>}>
      {!compact && (
        <h3 className="mb-4 text-lg font-semibold">{data.deck.name || 'Untitled deck'}</h3>
      )}
      <DeckContents deckId={deckId} compact={compact} />
    </Suspense>
  );
}

export default function DeckPreviewDialog({
  deckId,
  trigger,
  compact = true,
}: {
  deckId: string;
  trigger: ReactNode;
  compact?: boolean;
}) {
  return (
    <Dialog trigger={trigger} header="Decklist" size="large" contentClassName="w-full">
      <Preview deckId={deckId} compact={compact} />
    </Dialog>
  );
}
