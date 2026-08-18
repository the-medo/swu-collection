import { useGetDeckVersionDiff } from '@/api/decks/useGetDeckVersionDiff.ts';
import { useCardList } from '@/api/lists/useCardList.ts';

type VersionChange = {
  cardId: string;
  board: 1 | 2;
  quantityChange: number;
};

const ChangeList = ({ changes }: { changes: VersionChange[] }) => {
  const { data: cardList } = useCardList();
  const sortedChanges = [...changes].sort((left, right) => {
    const leftName = cardList?.cards[left.cardId]?.name ?? left.cardId;
    const rightName = cardList?.cards[right.cardId]?.name ?? right.cardId;
    return leftName.localeCompare(rightName);
  });

  return (
    <div className="space-y-0.5">
      {sortedChanges.map(change => {
        const cardName = cardList?.cards[change.cardId]?.name ?? change.cardId;
        const isAddition = change.quantityChange > 0;
        return (
          <div
            key={`${change.board}-${change.cardId}`}
            className={
              isAddition ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }
          >
            {isAddition ? '+' : ''}
            {change.quantityChange} {cardName}
          </div>
        );
      })}
    </div>
  );
};

const DeckVersionDiff = ({ deckId, versionId }: { deckId: string; versionId: string }) => {
  const { data, isLoading } = useGetDeckVersionDiff(deckId, versionId);
  if (isLoading) return <div className="text-xs text-muted-foreground">Loading changes…</div>;
  if (!data?.data.changes.length) {
    return <div className="text-xs text-muted-foreground">Metadata-only changes.</div>;
  }

  const mainboardAdditions = data.data.changes.filter(
    change => change.board === 1 && change.quantityChange > 0,
  );
  const mainboardRemovals = data.data.changes.filter(
    change => change.board === 1 && change.quantityChange < 0,
  );
  const sideboardAdditions = data.data.changes.filter(
    change => change.board === 2 && change.quantityChange > 0,
  );
  const sideboardRemovals = data.data.changes.filter(
    change => change.board === 2 && change.quantityChange < 0,
  );
  const hasMainboardChanges = mainboardAdditions.length > 0 || mainboardRemovals.length > 0;
  const hasSideboardChanges = sideboardAdditions.length > 0 || sideboardRemovals.length > 0;

  return (
    <div className="mt-2 space-y-2 border-l pl-2 text-xs">
      {hasMainboardChanges && (
        <div className="space-y-1">
          <div className="font-medium text-muted-foreground">Mainboard</div>
          <ChangeList changes={mainboardAdditions} />
          <ChangeList changes={mainboardRemovals} />
        </div>
      )}
      {hasSideboardChanges && (
        <div className="space-y-1">
          <div className="font-medium text-muted-foreground">Sideboard</div>
          <ChangeList changes={sideboardAdditions} />
          <ChangeList changes={sideboardRemovals} />
        </div>
      )}
    </div>
  );
};

export default DeckVersionDiff;
