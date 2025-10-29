import * as React from 'react';
import { useState } from 'react';
import { cn } from '@/lib/utils.ts';
import { ComparerEntry, ComparerSettings } from '@/components/app/comparer/useComparerStore.ts';
import { CardComparisonData } from '../types.ts';
import CardRowSectionTitleRow from './ViewRowCard/SectionTitleRow.tsx';
import CardRowCardTypeGroup from './ViewRowCard/CardTypeGroup.tsx';
import { CardListResponse } from '@/api/lists/useCardList.ts';
import { DeckComparerTotalsMap } from '@/components/app/comparer/ComparerPage/DeckComparer/types.ts';
import { DeckData } from '../../../../../../../types/Deck.ts';
import { CardGroupData } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/collectionGroupsLib.ts';
import { DeckCard } from '../../../../../../../types/ZDeckCard.ts';

interface ViewRowCardProps {
  mainDeckId: string;
  mainDeckData: DeckData | undefined;
  otherDeckEntries: ComparerEntry[];
  cardListData: CardListResponse | undefined;
  cardComparisons: CardComparisonData[];
  groupedCards:
    | {
        mainDeck: CardGroupData<DeckCard>;
        sideboard: CardGroupData<DeckCard>;
      }
    | undefined;
  groupTotals:
    | {
        mainDeck: DeckComparerTotalsMap;
        sideboard: DeckComparerTotalsMap;
      }
    | undefined;
  settings: ComparerSettings;
}

const ViewRowCard: React.FC<ViewRowCardProps> = ({
  mainDeckId,
  mainDeckData,
  otherDeckEntries,
  cardListData,
  cardComparisons,
  groupedCards,
  groupTotals,
  settings,
}) => {
  // State for tracking hovered row and column
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [hoveredColumn, setHoveredColumn] = useState<number | null>(null);

  return (
    <div className="overflow-auto max-h-[80vh]">
      <table className="border-collapse relative">
        <thead className="h-[140px] sticky top-0 z-30 bg-background">
          <tr className="">
            <th
              className="p-2 text-left w-20 sticky left-0 z-30 bg-background"
              onMouseEnter={() => setHoveredColumn(-1)}
              onMouseLeave={() => setHoveredColumn(null)}
            ></th>
            <th
              className="p-2 text-center w-16 relative sticky left-[180px] md:left-[250px] z-10 bg-background"
              onMouseEnter={() => setHoveredColumn(0)}
              onMouseLeave={() => setHoveredColumn(null)}
            >
              <div className="flex items-center">
                <div
                  className={cn(
                    'absolute border-b -rotate-20 bg-accent origin-left whitespace-nowrap transform -translate-x-[60px] -translate-y-[65px] truncate w-[500px] h-[300px] pt-[275px] pl-[20px]',
                  )}
                >
                  {mainDeckData?.deck?.name || ''}
                </div>
              </div>
            </th>
            {otherDeckEntries.map((entry, index) => (
              <th
                key={entry.id}
                className="p-2 text-center w-16 relative"
                onMouseEnter={() => setHoveredColumn(index + 1)}
                onMouseLeave={() => setHoveredColumn(null)}
              >
                <div className="flex items-center">
                  <div
                    className={cn(
                      'absolute -rotate-20 origin-left whitespace-nowrap transform translate-x-4 translate-y-[60px] truncate w-[300px]',
                      {
                        'bg-primary/20': hoveredColumn === index + 1,
                      },
                    )}
                  >
                    {entry.additionalData?.title || 'Other Deck'}
                  </div>
                </div>
              </th>
            ))}
            <th
              className="bg-background"
              onMouseEnter={() => setHoveredColumn(otherDeckEntries.length + 1)}
              onMouseLeave={() => setHoveredColumn(null)}
            ></th>
          </tr>
        </thead>
        <tbody>
          <CardRowSectionTitleRow
            title="Main Deck"
            mainDeckId={mainDeckId}
            otherDeckEntries={otherDeckEntries}
            hoveredColumn={hoveredColumn}
            setHoveredColumn={setHoveredColumn}
          />

          {groupedCards?.mainDeck.sortedIds?.map(groupName => {
            const group = groupedCards.mainDeck.groups[groupName];
            if (!group || !group.cards.length) return null;

            // Find the corresponding card comparison data for each card in the group
            const cardsInGroup = group.cards
              .map(card => {
                return cardComparisons.find(c => c.cardId === card.cardId && c.board === 1);
              })
              .filter(Boolean) as CardComparisonData[];

            // Sort cards: first by presence in main deck (cards in main deck first), then by cost
            cardsInGroup.sort((a, b) => {
              // First sort by presence in main deck (cards in main deck first)
              if (a.mainDeckQuantity > 0 && b.mainDeckQuantity === 0) return -1;
              if (a.mainDeckQuantity === 0 && b.mainDeckQuantity > 0) return 1;

              // Then sort by cost
              const costA = cardListData?.cards[a.cardId]?.cost ?? 0;
              const costB = cardListData?.cards[b.cardId]?.cost ?? 0;
              return costA - costB;
            });

            // Get pre-computed group totals for this group
            const preComputedTotals = groupTotals?.mainDeck?.[groupName];

            return (
              <CardRowCardTypeGroup
                key={groupName}
                groupName={group.label}
                cards={cardsInGroup}
                cardListData={cardListData}
                mainDeckId={mainDeckId}
                otherDeckEntries={otherDeckEntries}
                diffDisplayMode={settings.diffDisplayMode}
                hoveredRow={hoveredRow}
                setHoveredRow={setHoveredRow}
                hoveredColumn={hoveredColumn}
                setHoveredColumn={setHoveredColumn}
                preComputedTotals={preComputedTotals}
              />
            );
          })}

          {/* Sideboard Section */}
          {groupedCards?.sideboard.sortedIds?.some(groupName => {
            const group = groupedCards.sideboard.groups[groupName];
            return group && group.cards.length > 0;
          }) && (
            <>
              <CardRowSectionTitleRow
                title="Sideboard"
                mainDeckId={mainDeckId}
                otherDeckEntries={otherDeckEntries}
                hoveredColumn={hoveredColumn}
                setHoveredColumn={setHoveredColumn}
              />

              {groupedCards?.sideboard.sortedIds?.map(groupName => {
                const group = groupedCards.sideboard.groups[groupName];
                if (!group || !group.cards.length) return null;

                // Find the corresponding card comparison data for each card in the group
                const cardsInGroup = group.cards
                  .map(card => {
                    return cardComparisons.find(c => c.cardId === card.cardId && c.board === 2);
                  })
                  .filter(Boolean) as CardComparisonData[];

                // Sort cards: first by presence in main deck (cards in main deck first), then by cost
                cardsInGroup.sort((a, b) => {
                  // First sort by presence in main deck (cards in main deck first)
                  if (a.mainDeckQuantity > 0 && b.mainDeckQuantity === 0) return -1;
                  if (a.mainDeckQuantity === 0 && b.mainDeckQuantity > 0) return 1;

                  // Then sort by cost
                  const costA = cardListData?.cards[a.cardId]?.cost ?? 0;
                  const costB = cardListData?.cards[b.cardId]?.cost ?? 0;
                  return costA - costB;
                });

                // Get pre-computed group totals for this group
                const preComputedTotals = groupTotals?.sideboard?.[groupName];

                return (
                  <CardRowCardTypeGroup
                    key={groupName}
                    groupName={group.label}
                    cards={cardsInGroup}
                    cardListData={cardListData}
                    mainDeckId={mainDeckId}
                    otherDeckEntries={otherDeckEntries}
                    diffDisplayMode={settings.diffDisplayMode}
                    hoveredRow={hoveredRow}
                    setHoveredRow={setHoveredRow}
                    hoveredColumn={hoveredColumn}
                    setHoveredColumn={setHoveredColumn}
                    preComputedTotals={preComputedTotals}
                  />
                );
              })}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ViewRowCard;
