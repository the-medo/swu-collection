import * as React from 'react';
import { useState } from 'react';
import { cn } from '@/lib/utils.ts';
import ComparisonTable from './ComparisonTable.tsx';
import { comparerTableStyles as styles } from './comparerTableStyles.ts';
import DeckColumnMenu from './DeckColumnMenu.tsx';
import { Crown } from 'lucide-react';
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
    <ComparisonTable deckCount={otherDeckEntries.length + 1}>
      <table
        className={cn(styles.table, 'w-full table-fixed')}
        style={{
          width: `min(100%, calc(var(--comparer-name-width) + ${(otherDeckEntries.length + 1) * 100 + 96}px))`,
          minWidth: `calc(var(--comparer-name-width) + ${(otherDeckEntries.length + 1) * 80 + 96}px)`,
        }}
      >
        <caption className="sr-only">Card quantities and differences by deck</caption>
        <colgroup>
          <col style={{ width: 'var(--comparer-name-width)' }} />
          <col span={otherDeckEntries.length + 1} />
          <col style={{ width: 96 }} />
        </colgroup>
        <thead className="sticky top-0 z-30 bg-card">
          <tr>
            <th
              scope="col"
              className={cn(styles.name, 'z-40 align-bottom py-2 text-muted-foreground')}
            >
              Card / cost / aspect
            </th>
            {[
              { id: mainDeckId, name: mainDeckData?.deck?.name || 'Main deck' },
              ...otherDeckEntries.map(entry => ({
                id: entry.id,
                name: entry.additionalData?.title || 'Other deck',
              })),
            ].map((deck, index) => (
              <th
                key={deck.id}
                scope="col"
                className={cn(
                  'h-24 border-b border-r border-[var(--workspace-border)] px-2 py-2 align-top',
                  index === 0 && styles.reference,
                  hoveredColumn === index && styles.hover,
                )}
                onMouseEnter={() => setHoveredColumn(index)}
                onMouseLeave={() => setHoveredColumn(null)}
              >
                <div className="mb-1 flex h-6 items-center justify-between gap-1">
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                    {index === 0 ? (
                      <>
                        <Crown className="size-3 text-[var(--workspace-accent)]" /> Main
                      </>
                    ) : (
                      String(index + 1).padStart(2, '0')
                    )}
                  </span>
                  <DeckColumnMenu deckId={deck.id} isMainDeck={index === 0} deckName={deck.name} />
                </div>
                <div
                  className="line-clamp-3 break-words text-left text-[11px] leading-tight"
                  title={deck.name}
                >
                  {deck.name}
                </div>
              </th>
            ))}
            <th
              scope="col"
              className="min-w-24 border-b border-[var(--workspace-border)] bg-muted px-2 text-center text-muted-foreground"
            >
              Average
            </th>
          </tr>
        </thead>
        <tbody>
          <CardRowSectionTitleRow title="Main Deck" columnCount={otherDeckEntries.length + 3} />

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
              <CardRowSectionTitleRow title="Sideboard" columnCount={otherDeckEntries.length + 3} />

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
    </ComparisonTable>
  );
};

export default ViewRowCard;
