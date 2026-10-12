import { useGetDeckVersionDiff } from '@/api/decks/useGetDeckVersionDiff.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import { Button } from '@/components/ui/button.tsx';
import type { DeckVersionMetadata } from '../../../../../../types/Deck.ts';
import { formatData } from '../../../../../../types/Format.ts';

const metadataFields: Array<{ key: keyof DeckVersionMetadata; label: string }> = [
  { key: 'name', label: 'Name' },
  { key: 'leaderCardId1', label: 'Leader' },
  { key: 'leaderCardId2', label: 'Second leader' },
  { key: 'baseCardId', label: 'Base' },
  { key: 'format', label: 'Format' },
  { key: 'description', label: 'Description' },
];

const ValueChange = ({ before, after }: { before: string | null; after: string | null }) => (
  <div className="min-w-0 space-y-1 break-words whitespace-pre-wrap">
    <div className="max-h-48 overflow-auto text-muted-foreground">
      <span className="font-medium">Before: </span>
      {before || 'None'}
    </div>
    <div className="max-h-48 overflow-auto">
      <span className="font-medium">After: </span>
      {after || 'None'}
    </div>
  </div>
);

const DeckVersionDiff = ({ deckId, versionId }: { deckId: string; versionId: string }) => {
  const { data, isPending, isError, isFetching, refetch } = useGetDeckVersionDiff(
    deckId,
    versionId,
  );
  const { data: cardList } = useCardList();
  if (isPending)
    return (
      <div className="text-xs text-muted-foreground" role="status">
        Loading changes…
      </div>
    );
  if (isError || !data)
    return (
      <div className="space-y-1 text-xs" role="alert">
        <p>Could not load version changes.</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isFetching}
          onClick={() => void refetch()}
        >
          {isFetching ? 'Retrying…' : 'Retry changes'}
        </Button>
      </div>
    );

  const diff = data.data;
  const metadataChanges = metadataFields.filter(
    ({ key }) => (diff.metadata.before?.[key] ?? null) !== diff.metadata.after[key],
  );
  const cardName = (id: string) => {
    const card = cardList?.cards[id];
    return card?.name ?? id;
  };
  const metadataValue = (key: keyof DeckVersionMetadata, value: string | number | null) => {
    if (value === null) return null;
    if (key === 'format')
      return formatData.find(format => format.id === value)?.name ?? `Format ${value}`;
    if (key === 'leaderCardId1' || key === 'leaderCardId2' || key === 'baseCardId')
      return cardName(String(value));
    return String(value);
  };
  if (!diff.changes.length && !diff.noteChanges.length && !metadataChanges.length)
    return <div className="text-xs text-muted-foreground">No changes in this version.</div>;

  return (
    <div className="mt-2 min-w-0 space-y-3 border-l pl-2 text-xs">
      {metadataChanges.length > 0 && (
        <dl className="space-y-2">
          {metadataChanges.map(({ key, label }) => (
            <div key={key}>
              <dt className="font-medium">{label}</dt>
              <dd>
                <ValueChange
                  before={metadataValue(key, diff.metadata.before?.[key] ?? null)}
                  after={metadataValue(key, diff.metadata.after[key])}
                />
              </dd>
            </div>
          ))}
        </dl>
      )}
      {([1, 2] as const).map(board => {
        const changes = diff.changes
          .filter(change => change.board === board)
          .sort((a, b) => cardName(a.cardId).localeCompare(cardName(b.cardId)));
        const notes = diff.noteChanges
          .filter(change => change.board === board)
          .sort((a, b) => cardName(a.cardId).localeCompare(cardName(b.cardId)));
        if (!changes.length && !notes.length) return null;
        return (
          <div key={board} className="space-y-1">
            <div className="font-medium text-muted-foreground">
              {board === 1 ? 'Mainboard' : 'Sideboard'}
            </div>
            {changes.map(change => (
              <div
                key={change.cardId}
                className={
                  change.quantityChange > 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }
              >
                {change.quantityChange > 0 ? '+' : ''}
                {change.quantityChange} {cardName(change.cardId)}
              </div>
            ))}
            {notes.map(note => (
              <div key={note.cardId} className="space-y-1 pt-1">
                <div className="font-medium">{cardName(note.cardId)} — note</div>
                <ValueChange before={note.before} after={note.after} />
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};

export default DeckVersionDiff;
