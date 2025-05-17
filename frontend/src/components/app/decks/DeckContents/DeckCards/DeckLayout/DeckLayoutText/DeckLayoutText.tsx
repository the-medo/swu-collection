import { DeckCardsForLayout } from '@/components/app/decks/DeckContents/DeckCards/deckCardsLib.ts';
import DeckCardTextRow, {
  DeckCardRowVariant,
} from '@/components/app/decks/DeckContents/DeckCards/DeckLayout/DeckLayoutText/DeckCardTextRow.tsx';

interface DeckLayoutTextProps {
  variant: DeckCardRowVariant;
  deckId: string;
  deckCardsForLayout: DeckCardsForLayout;
  showSideboard?: boolean;
}

const DeckLayoutText: React.FC<DeckLayoutTextProps> = ({
  variant,
  deckId,
  deckCardsForLayout: { mainboardGroups, cardsByBoard, usedCardsInBoards, usedCards },
  showSideboard = true,
}) => {
  const columnClasses =
    '@container columns-1 @[700px]:columns-2 @[1050px]:columns-3 gap-4 space-y-4';

  return (
    <div className="@container flex w-full flex-col gap-4">
      <article className={columnClasses}>
        {mainboardGroups?.sortedIds.map(groupName => {
          const group = mainboardGroups?.groups[groupName];

          if (!group) return null;
          if (group.cards.length === 0) return null;
          return (
            <div className="flex flex-col gap-1 w-[350px] p-1 break-inside-avoid">
              <span className="font-medium">
                {group.label} ({group.cards.reduce((p, c) => p + c.quantity, 0)})
              </span>
              {group.cards.map(c => {
                return (
                  <DeckCardTextRow
                    key={c.cardId}
                    variant={variant}
                    deckId={deckId}
                    deckCard={c}
                    card={usedCards[c.cardId]}
                    cardInBoards={usedCardsInBoards[c.cardId]}
                  />
                );
              })}
            </div>
          );
        })}
        {showSideboard && (
          <div className="flex flex-col gap-1 w-[350px] p-1 bg-accent break-inside-avoid">
            <span className="font-medium">
              Sideboard ({cardsByBoard[2].reduce((p, c) => p + c.quantity, 0)})
            </span>
            {cardsByBoard[2].length === 0 && <span className="text-sm">No cards in sideboard</span>}
            {cardsByBoard[2].map(c => {
              return (
                <DeckCardTextRow
                  key={c.cardId}
                  variant={variant}
                  deckId={deckId}
                  deckCard={c}
                  card={usedCards[c.cardId]}
                  cardInBoards={usedCardsInBoards[c.cardId]}
                />
              );
            })}
          </div>
        )}
      </article>
      {cardsByBoard[3].length > 0 && (
        <div className="flex flex-col mt-8 gap-1 w-full">
          <span className="font-medium">
            Maybeboard ({cardsByBoard[3].reduce((p, c) => p + c.quantity, 0)})
          </span>
          <div className={columnClasses}>
            {cardsByBoard[3].map(c => {
              return (
                <DeckCardTextRow
                  key={c.cardId}
                  variant={variant}
                  deckId={deckId}
                  deckCard={c}
                  card={usedCards[c.cardId]}
                  cardInBoards={usedCardsInBoards[c.cardId]}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DeckLayoutText;
