import * as React from 'react';
import DeckCardHoverImage from '@/components/app/decks/DeckContents/DeckCards/DeckLayout/DeckCardHoverImage.tsx';
import CardImage from '@/components/app/global/CardImage.tsx';
import { selectDefaultVariant } from '../../../../../../../../server/lib/cards/selectDefaultVariant.ts';
import { CardListResponse } from '@/api/lists/useCardList.ts';
import { DeckComparerCardGroup } from '../types.ts';

interface ViewRowDeckHeaderProps {
  allCardGroups: DeckComparerCardGroup[];
  cardListData: CardListResponse | undefined;
  setHoveredColumn: (columnIndex: number | null) => void;
}

const ViewRowDeckHeader: React.FC<ViewRowDeckHeaderProps> = ({
  allCardGroups,
  cardListData,
  setHoveredColumn,
}) => {
  let lastGroupBoard = 0;

  return (
    <thead className="sticky top-0 z-30 bg-background">
      <tr>
        {/* First column: empty cell above deck names */}
        <th
          className="p-2 text-left w-40 sticky left-0 z-30 bg-background"
          onMouseLeave={() => setHoveredColumn(null)}
        >
          Decks / Cards
        </th>

        {/* Group columns with dividers */}
        {allCardGroups.map((group, groupIndex) => {
          // Get unique card IDs for this group
          const groupCardIds = Array.from(new Set(group.cards.map(card => card.cardId)));

          if (groupCardIds.length === 0) return null;
          const displayMainOrSideColumn = lastGroupBoard !== group.board;
          lastGroupBoard = group.board;

          return (
            <React.Fragment key={`${group.board}-${group.id}`}>
              {displayMainOrSideColumn && (
                <th className="p-0 bg-background text-center relative min-w-[40px] sticky left-[180px] md:left-[258px] z-50">
                  <div className=" h-[150px] w-full flex items-center justify-center bg-primary/20">
                    <div className="transform -rotate-90 origin-center whitespace-nowrap absolute font-semibold">
                      {lastGroupBoard === 1 ? 'Main Deck' : 'Sideboard'}
                    </div>
                  </div>
                </th>
              )}
              {/* Group divider column with rotated group name */}
              <th
                className="p-0 bg-accent text-center relative min-w-[80px]"
                onMouseLeave={() => setHoveredColumn(null)}
              >
                <div className="h-full flex items-center justify-center">
                  <div className="transform -rotate-90 origin-center whitespace-nowrap absolute">
                    <span className="font-semibold">{group.label}</span>
                  </div>
                </div>
              </th>

              {/* Card columns for this group */}
              {groupCardIds.map((cardId, cardIndex) => {
                const cardData = cardListData?.cards[cardId];
                const columnIndex = groupIndex * 100 + cardIndex + 1;

                return (
                  <th
                    key={`${group.id}-${cardId}`}
                    className="p-2 text-center min-w-[75px] relative"
                    onMouseEnter={() => setHoveredColumn(columnIndex)}
                    onMouseLeave={() => setHoveredColumn(null)}
                  >
                    <DeckCardHoverImage card={cardData}>
                      <div className="flex flex-col items-center">
                        <CardImage
                          card={cardData}
                          cardVariantId={cardData ? selectDefaultVariant(cardData) : undefined}
                          size="w75"
                        />
                        <span className="text-xs truncate max-w-[75px]">{cardData?.name}</span>
                      </div>
                    </DeckCardHoverImage>
                  </th>
                );
              })}
            </React.Fragment>
          );
        })}

        {/* Total column */}
        <th className="bg-background p-2 text-center" onMouseLeave={() => setHoveredColumn(null)}>
          Total
        </th>
      </tr>
    </thead>
  );
};

export default ViewRowDeckHeader;
