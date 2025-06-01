import * as React from 'react';
import { cn } from '@/lib/utils.ts';
import { CardComparisonData } from '../../types.ts';
import { calculateGroupTotals, calculateAndRenderGroupAverage } from './lib.ts';
import DeckNameCell from './DeckNameCell.tsx';
import CardQuantityCell from './CardQuantityCell.tsx';
import { DiffDisplayMode } from '../../../../../../../../types/enums.ts';

interface CardTypeGroupProps {
  groupName: string;
  cards: CardComparisonData[];
  cardListData: any;
  mainDeckId: string;
  mainDeckName: string;
  otherDeckEntries: { id: string; additionalData?: { title?: string } }[];
  diffDisplayMode?: DiffDisplayMode;
  hoveredRow: string | null;
  setHoveredRow: (row: string | null) => void;
  hoveredColumn: number | null;
  setHoveredColumn: (column: number | null) => void;
}

/**
 * Component for rendering a group of cards by type
 */
const CardTypeGroup: React.FC<CardTypeGroupProps> = ({
  groupName,
  cards,
  cardListData,
  mainDeckId,
  mainDeckName,
  otherDeckEntries,
  diffDisplayMode = DiffDisplayMode.COUNT_AND_DIFF,
  hoveredRow,
  setHoveredRow,
  hoveredColumn,
  setHoveredColumn,
}) => {
  if (!cards.length) return null;

  // Get unique card IDs from the group
  const uniqueCardIds = Array.from(new Set(cards.map(card => card.cardId)));

  // Calculate totals for each deck
  const { mainDeckTotal, otherDeckTotals, allTotals } = calculateGroupTotals(
    cards,
    otherDeckEntries.map(entry => entry.id),
  );

  // Get other deck IDs for easier access
  const otherDeckIds = otherDeckEntries.map(entry => entry.id);

  return (
    <React.Fragment>
      {/* Group header row with rotated group name */}
      <tr
        className="border-t"
        onMouseEnter={() => setHoveredRow(`group-${groupName}`)}
        onMouseLeave={() => setHoveredRow(null)}
      >
        <td
          className="p-1 font-medium sticky left-0 z-10 bg-accent"
          onMouseEnter={() => setHoveredColumn(-1)}
          onMouseLeave={() => setHoveredColumn(null)}
        >
          <div className="flex items-center">
            <div className="transform -rotate-90 origin-left whitespace-nowrap h-20 flex items-center">
              {groupName}
            </div>
            <div className="ml-4 font-semibold">{mainDeckTotal}</div>
          </div>
        </td>

        {uniqueCardIds.map((cardId, index) => {
          const cardData = cardListData?.cards[cardId];
          const cardsWithThisId = cards.filter(c => c.cardId === cardId);
          const totalQty = cardsWithThisId.reduce((sum, c) => sum + c.mainDeckQuantity, 0);

          return (
            <CardQuantityCell
              key={cardId}
              cardId={cardId}
              cardData={cardData}
              mainQty={totalQty}
              otherQty={totalQty}
              diffDisplayMode={diffDisplayMode}
              isHovered={hoveredRow === `group-${groupName}` || hoveredColumn === index + 1}
              onMouseEnter={() => setHoveredColumn(index + 1)}
              onMouseLeave={() => setHoveredColumn(null)}
              className="bg-accent"
              isHeader={true}
            />
          );
        })}

        <td
          className="p-1 text-center w-20 font-semibold bg-accent relative"
          onMouseEnter={() => setHoveredColumn(uniqueCardIds.length + 1)}
          onMouseLeave={() => setHoveredColumn(null)}
        >
          <div className="absolute top-0 left-0 bottom-0 w-[2px] bg-border"> </div>
          {(() => {
            const { formattedAvgTotal, hasDiff, textColorClass, formattedDiff } =
              calculateAndRenderGroupAverage(mainDeckTotal, allTotals);

            if (!hasDiff) {
              return <span>{formattedAvgTotal}</span>;
            }

            return (
              <span className={`${textColorClass} font-medium`}>
                {formattedAvgTotal} <span className="text-xs">({formattedDiff})</span>
              </span>
            );
          })()}
        </td>
      </tr>

      {/* Main deck row */}
      <tr
        className={cn('border-t', {
          'bg-accent': hoveredRow === mainDeckId,
        })}
        onMouseEnter={() => setHoveredRow(mainDeckId)}
        onMouseLeave={() => setHoveredRow(null)}
      >
        <DeckNameCell
          deckId={mainDeckId}
          deckName={mainDeckName}
          isMainDeck={true}
          isHovered={hoveredRow === mainDeckId}
          onMouseEnter={() => setHoveredColumn(-1)}
          onMouseLeave={() => setHoveredColumn(null)}
        />

        {uniqueCardIds.map((cardId, index) => {
          const cardData = cardListData?.cards[cardId];
          const cardsWithThisId = cards.filter(c => c.cardId === cardId);
          const mainQty = cardsWithThisId.reduce((sum, c) => sum + c.mainDeckQuantity, 0);

          return (
            <CardQuantityCell
              key={cardId}
              cardId={cardId}
              cardData={cardData}
              mainQty={mainQty}
              otherQty={mainQty}
              diffDisplayMode={diffDisplayMode}
              isHovered={hoveredRow === mainDeckId || hoveredColumn === index + 1}
              onMouseEnter={() => setHoveredColumn(index + 1)}
              onMouseLeave={() => setHoveredColumn(null)}
            />
          );
        })}

        <td
          className="p-1 text-center bg-accent relative"
          onMouseEnter={() => setHoveredColumn(uniqueCardIds.length + 1)}
          onMouseLeave={() => setHoveredColumn(null)}
        >
          <div className="absolute top-0 left-0 bottom-0 w-[2px] bg-border"> </div>
          {mainDeckTotal}
        </td>
      </tr>

      {/* Other deck rows */}
      {otherDeckEntries.map((entry, entryIndex) => {
        const deckId = entry.id;
        const deckName = entry.additionalData?.title || 'Other Deck';

        return (
          <tr
            key={deckId}
            className={cn('border-t', {
              'bg-accent': hoveredRow === deckId,
            })}
            onMouseEnter={() => setHoveredRow(deckId)}
            onMouseLeave={() => setHoveredRow(null)}
          >
            <DeckNameCell
              deckId={deckId}
              deckName={deckName}
              isMainDeck={false}
              isHovered={hoveredRow === deckId}
              onMouseEnter={() => setHoveredColumn(-1)}
              onMouseLeave={() => setHoveredColumn(null)}
            />

            {uniqueCardIds.map((cardId, index) => {
              const cardData = cardListData?.cards[cardId];
              const cardsWithThisId = cards.filter(c => c.cardId === cardId);
              const mainQty = cardsWithThisId.reduce((sum, c) => sum + c.mainDeckQuantity, 0);
              const otherQty = cardsWithThisId.reduce(
                (sum, c) => sum + (c.otherDecksQuantities[deckId] || 0),
                0,
              );

              return (
                <CardQuantityCell
                  key={cardId}
                  cardId={cardId}
                  cardData={cardData}
                  mainQty={mainQty}
                  otherQty={otherQty}
                  diffDisplayMode={diffDisplayMode}
                  isHovered={hoveredRow === deckId || hoveredColumn === index + 1}
                  onMouseEnter={() => setHoveredColumn(index + 1)}
                  onMouseLeave={() => setHoveredColumn(null)}
                />
              );
            })}

            <td
              className="p-1 text-center bg-accent relative"
              onMouseEnter={() => setHoveredColumn(uniqueCardIds.length + 1)}
              onMouseLeave={() => setHoveredColumn(null)}
            >
              <div className="absolute top-0 left-0 bottom-0 w-[2px] bg-border"> </div>
              {otherDeckTotals[deckId]}
            </td>
          </tr>
        );
      })}
    </React.Fragment>
  );
};

export default CardTypeGroup;
