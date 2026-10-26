import * as React from 'react';
import { cn } from '@/lib/utils.ts';
import { comparerTableStyles as styles } from '../comparerTableStyles.ts';
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
  const groups = allCardGroups.filter(group => group.cards.length > 0);
  const boards = [...new Set(groups.map(group => group.board))];

  return (
    <thead className="sticky top-0 z-30 bg-card">
      <tr>
        <th
          scope="col"
          rowSpan={3}
          className={cn(styles.name, 'z-40 border-b align-bottom pb-2 text-muted-foreground')}
        >
          Deck / card
        </th>
        {boards.map(board => (
          <th
            key={board}
            scope="colgroup"
            colSpan={groups
              .filter(group => group.board === board)
              .reduce(
                (count, group) => count + new Set(group.cards.map(card => card.cardId)).size + 1,
                0,
              )}
            className="border-b border-r border-[var(--workspace-border)] bg-[var(--workspace-soft)] py-1 text-left text-[10px] uppercase tracking-wider text-[var(--workspace-accent)]"
          >
            <span className="sticky left-[var(--comparer-name-width)] inline-block px-2">
              {board === 1 ? 'Main deck' : 'Sideboard'}
            </span>
          </th>
        ))}
        <th
          scope="col"
          rowSpan={3}
          className="min-w-20 border-b border-l border-[var(--workspace-border)] bg-muted px-2 align-bottom pb-2"
        >
          Total
        </th>
      </tr>
      <tr>
        {groups.map(group => (
          <th
            key={`${group.board}-${group.id}`}
            scope="colgroup"
            colSpan={new Set(group.cards.map(card => card.cardId)).size + 1}
            className="border-b border-r border-[var(--workspace-border)] bg-muted/50 py-1 text-left text-[11px]"
          >
            <span className="sticky left-[var(--comparer-name-width)] inline-block px-2">
              {group.label}
            </span>
          </th>
        ))}
      </tr>
      <tr>
        {groups.map(group => (
          <React.Fragment key={`${group.board}-${group.id}`}>
            <th
              scope="col"
              className="min-w-20 border-b border-[var(--workspace-border)] bg-muted/50 px-1.5 align-bottom pb-2 text-[10px] text-muted-foreground"
            >
              Subtotal
            </th>
            {[...new Set(group.cards.map(card => card.cardId))].map((cardId, cardIndex) => {
              const cardData = cardListData?.cards[cardId];
              const columnIndex = allCardGroups.indexOf(group) * 100 + cardIndex + 1;
              return (
                <th
                  key={cardId}
                  scope="col"
                  className="w-20 min-w-20 max-w-20 border-b border-r border-[var(--workspace-border)] px-1 py-1.5 align-bottom"
                  onMouseEnter={() => setHoveredColumn(columnIndex)}
                  onMouseLeave={() => setHoveredColumn(null)}
                >
                  <DeckCardHoverImage card={cardData}>
                    <div
                      className="flex flex-col items-center gap-1"
                      title={
                        [cardData?.name, cardData?.subtitle].filter(Boolean).join(' — ') || cardId
                      }
                    >
                      <CardImage
                        card={cardData}
                        cardVariantId={cardData ? selectDefaultVariant(cardData) : undefined}
                        size="w50"
                      />
                      <span className="line-clamp-2 h-7 w-full break-words text-[10px] leading-tight">
                        {cardData?.name || cardId}
                      </span>
                    </div>
                  </DeckCardHoverImage>
                </th>
              );
            })}
          </React.Fragment>
        ))}
      </tr>
    </thead>
  );
};

export default ViewRowDeckHeader;
