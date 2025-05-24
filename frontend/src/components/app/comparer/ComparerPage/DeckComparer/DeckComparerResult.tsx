import * as React from 'react';
import { useMemo, useState } from 'react';
import {
  useComparerStore,
  ViewMode,
  DiffDisplayMode,
} from '@/components/app/comparer/useComparerStore.ts';
import { queryClient } from '@/queryClient.ts';
import { DeckCard } from '../../../../../../../types/ZDeckCard.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import { groupCardsByCardType } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/groupCardsByCardType.ts';
import { groupCardsByCost } from '@/components/app/decks/DeckContents/DeckCards/lib/groupCardsByCost.ts';
import { groupCardsByAspect } from '@/components/app/decks/DeckContents/DeckCards/lib/groupCardsByAspect.ts';
import { groupCardsByTrait } from '@/components/app/decks/DeckContents/DeckCards/lib/groupCardsByTrait.ts';
import { groupCardsByKeywords } from '@/components/app/decks/DeckContents/DeckCards/lib/groupCardsByKeywords.ts';
import { DeckGroupBy } from '@/components/app/decks/DeckContents/useDeckLayoutStore.ts';
import { CardComparisonData } from '../types.ts';
import { cn } from '@/lib/utils.ts';
import CardImage from '@/components/app/global/CardImage.tsx';
// ViewRowCard components
import CardRowSectionTitleRow from './ViewRowCard/SectionTitleRow.tsx';
import CardRowCardTypeGroup from './ViewRowCard/CardTypeGroup.tsx';
import { calculateAverage, formatDifference, getDiffColorClass } from './ViewRowCard/lib.ts';
import { selectDefaultVariant } from '../../../../../../../server/lib/cards/selectDefaultVariant.ts';
import DeckColumnMenu from '@/components/app/comparer/ComparerPage/DeckComparer/DeckColumnMenu.tsx';
import { useGetDeck } from '@/api/decks/useGetDeck.ts';
import { useGetDeckCards } from '@/api/decks/useGetDeckCards.ts';

interface DeckComparerResultProps {
  mainDeckId: string;
  otherDeckEntries: ReturnType<typeof useComparerStore>['entries'];
}

/**
 * Component for comparing decks and displaying the comparison results
 */
const DeckComparerResult: React.FC<DeckComparerResultProps> = ({
  mainDeckId,
  otherDeckEntries,
}) => {
  // State for tracking hovered row and column
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [hoveredColumn, setHoveredColumn] = useState<number | null>(null);

  // Get settings from the comparer store
  const { settings } = useComparerStore();

  // Get main deck data and cards from cache
  const { data: mainDeckData } = useGetDeck(mainDeckId);
  const { data: mainDeckCards } = useGetDeckCards(mainDeckId);

  // Get card list data
  const { data: cardListData } = useCardList();

  // Create a map of all cards across all decks
  const cardComparisonMap = useMemo(() => {
    const comparisonMap = new Map<string, CardComparisonData>();
    // Track cards by board for the main deck
    const mainDeckCardsByBoard: Record<string, Record<number, number>> = {};

    // Process main deck cards
    if (mainDeckCards?.data && cardListData) {
      // First pass: collect quantities by board
      mainDeckCards.data.forEach(card => {
        if (!mainDeckCardsByBoard[card.cardId]) {
          mainDeckCardsByBoard[card.cardId] = {};
        }
        mainDeckCardsByBoard[card.cardId][card.board] = card.quantity;
      });

      // Second pass: create entries in the map
      mainDeckCards.data.forEach(card => {
        const cardData = cardListData.cards[card.cardId];
        const mapKey = `${card.cardId}-${card.board}`;
        comparisonMap.set(mapKey, {
          cardId: card.cardId,
          mainDeckQuantity: card.quantity,
          otherDecksQuantities: {},
          board: card.board,
          cardType: cardData?.type || 'Unknown',
        });
      });
    }

    // Process other decks' cards
    otherDeckEntries.forEach(entry => {
      const deckId = entry.id;
      const deckCards = queryClient.getQueryData<{ data: DeckCard[] }>(['deck-content', deckId]);

      if (deckCards?.data && cardListData) {
        deckCards.data.forEach(card => {
          const mapKey = `${card.cardId}-${card.board}`;
          const existingCard = comparisonMap.get(mapKey);
          const cardData = cardListData.cards[card.cardId];

          if (existingCard) {
            // Card exists in main deck with the same board, update other deck quantity
            existingCard.otherDecksQuantities[deckId] = card.quantity;
          } else {
            // If the card exists in main deck but in a different board, we still want to add it
            // as a separate entry for the other deck
            comparisonMap.set(mapKey, {
              cardId: card.cardId,
              mainDeckQuantity: 0,
              otherDecksQuantities: { [deckId]: card.quantity },
              board: card.board,
              cardType: cardData?.type || 'Unknown',
            });
          }
        });
      }
    });

    return comparisonMap;
  }, [mainDeckId, mainDeckCards, otherDeckEntries, cardListData]);

  // Convert map to array for rendering
  const cardComparisons = useMemo(() => {
    return Array.from(cardComparisonMap.values());
  }, [cardComparisonMap]);

  // Group cards by board and type
  const groupedCards = useMemo(() => {
    if (!cardListData) return undefined;

    // Create fake DeckCard objects for groupCardsByCardType
    const mainDeckCards = cardComparisons
      .filter(card => card.board === 1)
      .map(card => ({
        cardId: card.cardId,
        board: 1,
        quantity: card.mainDeckQuantity,
        deckId: mainDeckId,
        note: '',
      }));

    const sideboardCards = cardComparisons
      .filter(card => card.board === 2)
      .map(card => ({
        cardId: card.cardId,
        board: 2,
        quantity: card.mainDeckQuantity,
        deckId: mainDeckId,
        note: '',
      }));

    // Select grouping function based on settings
    let mainDeckGroups;
    let sideboardGroups;

    switch (settings.groupBy) {
      case DeckGroupBy.COST:
        mainDeckGroups = groupCardsByCost(cardListData.cards, mainDeckCards);
        sideboardGroups = groupCardsByCost(cardListData.cards, sideboardCards);
        break;
      case DeckGroupBy.ASPECT:
        mainDeckGroups = groupCardsByAspect(cardListData.cards, mainDeckCards);
        sideboardGroups = groupCardsByAspect(cardListData.cards, sideboardCards);
        break;
      case DeckGroupBy.TRAIT:
        mainDeckGroups = groupCardsByTrait(cardListData.cards, mainDeckCards);
        sideboardGroups = groupCardsByTrait(cardListData.cards, sideboardCards);
        break;
      case DeckGroupBy.KEYWORDS:
        mainDeckGroups = groupCardsByKeywords(cardListData.cards, mainDeckCards);
        sideboardGroups = groupCardsByKeywords(cardListData.cards, sideboardCards);
        break;
      case DeckGroupBy.CARD_TYPE:
      default:
        mainDeckGroups = groupCardsByCardType(cardListData.cards, mainDeckCards);
        sideboardGroups = groupCardsByCardType(cardListData.cards, sideboardCards);
        break;
    }

    return {
      mainDeck: mainDeckGroups,
      sideboard: sideboardGroups,
    };
  }, [cardComparisons, cardListData, mainDeckId, settings.groupBy]);

  // Pre-compute group totals and deck totals for all decks
  const { groupTotals, deckTotals } = useMemo(() => {
    if (!groupedCards || !cardListData) return { groupTotals: undefined, deckTotals: undefined };

    // Initialize the result objects
    const groupTotalsResult = {
      mainDeck: {} as Record<
        string,
        {
          mainDeckTotal: number;
          otherDeckTotals: Record<string, number>;
          allTotals: number[];
        }
      >,
      sideboard: {} as Record<
        string,
        {
          mainDeckTotal: number;
          otherDeckTotals: Record<string, number>;
          allTotals: number[];
        }
      >,
    };

    // Initialize deck totals
    const deckTotalsResult = {
      mainDeckTotal: 0,
      otherDeckTotals: {} as Record<string, number>,
      allTotals: [] as number[],
    };

    // Initialize other deck totals
    otherDeckEntries.forEach(entry => {
      deckTotalsResult.otherDeckTotals[entry.id] = 0;
    });

    // Process main deck groups
    groupedCards.mainDeck.sortedIds.forEach(groupId => {
      const group = groupedCards.mainDeck.groups[groupId];
      if (!group || !group.cards.length) return;

      // Find the corresponding card comparison data for each card in the group
      const cardsInGroup = group.cards
        .map(card => {
          return cardComparisons.find(c => c.cardId === card.cardId && c.board === 1);
        })
        .filter(Boolean) as CardComparisonData[];

      // Calculate totals for this group
      const mainDeckTotal = cardsInGroup.reduce((sum, card) => sum + card.mainDeckQuantity, 0);
      const otherDeckTotals: Record<string, number> = {};

      otherDeckEntries.forEach(entry => {
        const deckId = entry.id;
        const deckTotal = cardsInGroup.reduce(
          (sum, card) => sum + (card.otherDecksQuantities[deckId] || 0),
          0,
        );
        otherDeckTotals[deckId] = deckTotal;

        // Add to deck totals
        deckTotalsResult.otherDeckTotals[deckId] += deckTotal;
      });

      const allTotals = [mainDeckTotal, ...Object.values(otherDeckTotals)];

      // Store the results
      groupTotalsResult.mainDeck[groupId] = { mainDeckTotal, otherDeckTotals, allTotals };

      // Add to main deck total
      deckTotalsResult.mainDeckTotal += mainDeckTotal;
    });

    // Process sideboard groups
    groupedCards.sideboard.sortedIds.forEach(groupId => {
      const group = groupedCards.sideboard.groups[groupId];
      if (!group || !group.cards.length) return;

      // Find the corresponding card comparison data for each card in the group
      const cardsInGroup = group.cards
        .map(card => {
          return cardComparisons.find(c => c.cardId === card.cardId && c.board === 2);
        })
        .filter(Boolean) as CardComparisonData[];

      // Calculate totals for this group
      const mainDeckTotal = cardsInGroup.reduce((sum, card) => sum + card.mainDeckQuantity, 0);
      const otherDeckTotals: Record<string, number> = {};

      otherDeckEntries.forEach(entry => {
        const deckId = entry.id;
        const deckTotal = cardsInGroup.reduce(
          (sum, card) => sum + (card.otherDecksQuantities[deckId] || 0),
          0,
        );
        otherDeckTotals[deckId] = deckTotal;

        // Add to deck totals
        deckTotalsResult.otherDeckTotals[deckId] += deckTotal;
      });

      const allTotals = [mainDeckTotal, ...Object.values(otherDeckTotals)];

      // Store the results
      groupTotalsResult.sideboard[groupId] = { mainDeckTotal, otherDeckTotals, allTotals };

      // Add to main deck total
      deckTotalsResult.mainDeckTotal += mainDeckTotal;
    });

    // Calculate all totals for deck totals
    deckTotalsResult.allTotals = [
      deckTotalsResult.mainDeckTotal,
      ...Object.values(deckTotalsResult.otherDeckTotals),
    ];

    return {
      groupTotals: groupTotalsResult,
      deckTotals: deckTotalsResult,
    };
  }, [groupedCards, cardComparisons, mainDeckId, otherDeckEntries, cardListData]);

  // Render based on view mode
  if (settings.viewMode === ViewMode.ROW_DECK) {
    // Create an array of all decks (main deck + other decks)
    const allDecks = [
      { id: mainDeckId, name: mainDeckData?.deck?.name || 'Main Deck', isMain: true },
      ...otherDeckEntries.map(entry => ({
        id: entry.id,
        name: entry.additionalData?.title || 'Other Deck',
        isMain: false,
      })),
    ];

    // Get all card groups from both main deck and sideboard
    const allCardGroups = [
      ...(groupedCards?.mainDeck.sortedIds || []).map(groupId => ({
        id: groupId,
        label: groupedCards?.mainDeck.groups[groupId]?.label || groupId,
        board: 1,
        cards: groupedCards?.mainDeck.groups[groupId]?.cards || [],
      })),
      ...(groupedCards?.sideboard.sortedIds || []).map(groupId => ({
        id: groupId,
        label: groupedCards?.sideboard.groups[groupId]?.label || groupId,
        board: 2,
        cards: groupedCards?.sideboard.groups[groupId]?.cards || [],
      })),
    ];

    let lastGroupBoard = 0;

    return (
      <div className="overflow-auto max-h-[80vh]">
        <table className="border-collapse relative">
          <thead className="sticky top-0 z-30 bg-background">
            <tr>
              {/* First column: empty cell above deck names */}
              <th
                className="p-2 text-left w-40 sticky left-0 z-30 bg-background"
                onMouseEnter={() => setHoveredColumn(-1)}
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
                      onMouseEnter={() => setHoveredColumn(groupIndex * 100)}
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
                          <div className="flex flex-col items-center">
                            <CardImage
                              card={cardData}
                              cardVariantId={cardData ? selectDefaultVariant(cardData) : undefined}
                              size="w75"
                            />
                            <span className="text-xs truncate max-w-[75px]">{cardData?.name}</span>
                          </div>
                        </th>
                      );
                    })}
                  </React.Fragment>
                );
              })}

              {/* Total column */}
              <th
                className="bg-background p-2 text-center"
                onMouseEnter={() => setHoveredColumn(9999)}
                onMouseLeave={() => setHoveredColumn(null)}
              >
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {/* One row per deck */}
            {allDecks.map(deck => (
              <tr
                key={deck.id}
                className={cn('border-t', {
                  'bg-accent': hoveredRow === deck.id || deck.isMain,
                  'font-semibold': deck.isMain,
                })}
                onMouseEnter={() => setHoveredRow(deck.id)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                {/* Deck name cell */}
                <td
                  className={cn('p-2 sticky left-0 z-10 bg-background', {
                    'bg-accent': hoveredRow === deck.id,
                    'font-semibold': deck.isMain,
                  })}
                  onMouseEnter={() => setHoveredColumn(-1)}
                  onMouseLeave={() => setHoveredColumn(null)}
                >
                  <div className="flex items-center justify-between gap-2 max-w-[172px] md:max-w-[242px] overflow-hidden">
                    <span className="truncate">{deck.name}</span>
                    {deck.isMain && <span className="text-xs text-muted-foreground">(Main)</span>}
                  </div>
                </td>

                {/* Card quantity cells for each group */}
                {allCardGroups.map((group, groupIndex) => {
                  // Get unique card IDs for this group
                  const groupCardIds = Array.from(new Set(group.cards.map(card => card.cardId)));

                  if (groupCardIds.length === 0) return null;
                  const displayMainOrSideColumn = lastGroupBoard !== group.board;
                  lastGroupBoard = group.board;

                  // Use pre-computed group totals
                  const groupTotal = deck.isMain
                    ? groupTotals?.[group.board === 1 ? 'mainDeck' : 'sideboard']?.[group.id]
                        ?.mainDeckTotal || 0
                    : groupTotals?.[group.board === 1 ? 'mainDeck' : 'sideboard']?.[group.id]
                        ?.otherDeckTotals?.[deck.id] || 0;

                  return (
                    <React.Fragment key={`${deck.id}-${group.board}-${group.id}`}>
                      {displayMainOrSideColumn && (
                        <td className="p-0 bg-background relative sticky left-[180px] md:left-[258px] z-50">
                          <div className="p-1 bg-primary/20 flex items-center justify-center">
                            <DeckColumnMenu deckId={deck.id} isMainDeck={deck.isMain} />
                          </div>
                        </td>
                      )}
                      {/* Group divider cell */}
                      <td
                        className="p-1 bg-accent text-center relative"
                        onMouseEnter={() => setHoveredColumn(groupIndex * 100)}
                        onMouseLeave={() => setHoveredColumn(null)}
                      >
                        {/* Group total for this deck */}
                        {(() => {
                          // If it's the main deck, just show the total
                          if (deck.isMain) {
                            return groupTotal;
                          }

                          // Use pre-computed main deck group total
                          const mainDeckGroupTotal =
                            groupTotals?.[group.board === 1 ? 'mainDeck' : 'sideboard']?.[group.id]
                              ?.mainDeckTotal || 0;

                          // Calculate the difference
                          const diff = groupTotal - mainDeckGroupTotal;

                          // If there's no difference, just show the total
                          if (diff === 0) {
                            return groupTotal;
                          }

                          // Determine text color based on diff
                          const textColorClass = diff > 0 ? 'text-green-600' : 'text-red-600';

                          // Format the diff with a + sign if positive
                          const formattedDiff = diff > 0 ? `+${diff}` : `${diff}`;

                          // Render based on display mode
                          if (settings.diffDisplayMode === DiffDisplayMode.COUNT_ONLY) {
                            return (
                              <span className={cn('font-medium', textColorClass)}>
                                {groupTotal}
                              </span>
                            );
                          } else if (settings.diffDisplayMode === DiffDisplayMode.DIFF_ONLY) {
                            return (
                              <span className={cn('font-medium', textColorClass)}>
                                {formattedDiff}
                              </span>
                            );
                          } else {
                            // Default: COUNT_AND_DIFF
                            return (
                              <span className={cn('font-medium', textColorClass)}>
                                {groupTotal} <span className="text-xs">({formattedDiff})</span>
                              </span>
                            );
                          }
                        })()}
                      </td>

                      {/* Card quantity cells */}
                      {groupCardIds.map((cardId, cardIndex) => {
                        const columnIndex = groupIndex * 100 + cardIndex + 1;

                        // Find card comparison data
                        const cardComparisonData = cardComparisons.find(
                          c => c.cardId === cardId && c.board === group.board,
                        );

                        if (!cardComparisonData) {
                          return (
                            <td
                              key={`${deck.id}-${group.id}-${cardId}`}
                              className={cn('p-1 text-center min-w-[55px]', {
                                'bg-accent':
                                  hoveredRow === deck.id || hoveredColumn === columnIndex,
                              })}
                              onMouseEnter={() => setHoveredColumn(columnIndex)}
                              onMouseLeave={() => setHoveredColumn(null)}
                            >
                              0
                            </td>
                          );
                        }

                        const mainQty = cardComparisonData.mainDeckQuantity;
                        const otherQty = deck.isMain
                          ? mainQty
                          : cardComparisonData.otherDecksQuantities[deck.id] || 0;
                        const diff = otherQty - mainQty;

                        // If there's no difference or it's the main deck, just show the quantity
                        if (diff === 0 || deck.isMain) {
                          return (
                            <td
                              key={`${deck.id}-${group.id}-${cardId}`}
                              className={cn('p-1 text-center min-w-[55px]', {
                                'bg-accent':
                                  hoveredRow === deck.id || hoveredColumn === columnIndex,
                              })}
                              onMouseEnter={() => setHoveredColumn(columnIndex)}
                              onMouseLeave={() => setHoveredColumn(null)}
                            >
                              {otherQty}
                            </td>
                          );
                        }

                        // Determine text color based on diff
                        const textColorClass = diff > 0 ? 'text-green-600' : 'text-red-600';

                        // Format the diff with a + sign if positive
                        const formattedDiff = diff > 0 ? `+${diff}` : `${diff}`;

                        // Render based on display mode
                        let content;
                        if (settings.diffDisplayMode === DiffDisplayMode.COUNT_ONLY) {
                          content = (
                            <span className={cn('font-medium', textColorClass)}>{otherQty}</span>
                          );
                        } else if (settings.diffDisplayMode === DiffDisplayMode.DIFF_ONLY) {
                          content = (
                            <span className={cn('font-medium', textColorClass)}>
                              {formattedDiff}
                            </span>
                          );
                        } else {
                          // Default: COUNT_AND_DIFF
                          content = (
                            <span className={cn('font-medium', textColorClass)}>
                              {otherQty} <span className="text-xs">({formattedDiff})</span>
                            </span>
                          );
                        }

                        return (
                          <td
                            key={`${deck.id}-${group.id}-${cardId}`}
                            className={cn('p-1 text-center min-w-[55px]', {
                              'bg-accent': hoveredRow === deck.id || hoveredColumn === columnIndex,
                            })}
                            onMouseEnter={() => setHoveredColumn(columnIndex)}
                            onMouseLeave={() => setHoveredColumn(null)}
                          >
                            {content}
                          </td>
                        );
                      })}
                    </React.Fragment>
                  );
                })}

                {/* Total cell */}
                <td
                  className="p-1 text-center bg-accent relative"
                  onMouseEnter={() => setHoveredColumn(9999)}
                  onMouseLeave={() => setHoveredColumn(null)}
                >
                  {(() => {
                    // Use pre-computed deck total
                    const deckTotal = deck.isMain
                      ? deckTotals?.mainDeckTotal || 0
                      : deckTotals?.otherDeckTotals?.[deck.id] || 0;

                    return deckTotal;
                  })()}
                </td>
              </tr>
            ))}

            {/* Average row */}
            <tr
              key="average-row"
              className="border-t font-semibold bg-accent"
              onMouseEnter={() => setHoveredRow('average-row')}
              onMouseLeave={() => setHoveredRow(null)}
            >
              {/* Average label cell */}
              <td
                className="p-2 sticky left-0 z-10 font-semibold bg-accent"
                onMouseEnter={() => setHoveredColumn(-1)}
                onMouseLeave={() => setHoveredColumn(null)}
              >
                <div className="flex items-center justify-between gap-2 max-w-[172px] md:max-w-[242px] overflow-hidden">
                  <span className="truncate">Average</span>
                </div>
              </td>

              {/* Card quantity cells for each group */}
              {allCardGroups.map((group, groupIndex) => {
                // Get unique card IDs for this group
                const groupCardIds = Array.from(new Set(group.cards.map(card => card.cardId)));

                if (groupCardIds.length === 0) return null;
                const displayMainOrSideColumn = lastGroupBoard !== group.board;
                lastGroupBoard = group.board;

                // Get all deck IDs except the main deck
                const otherDeckIds = allDecks.filter(deck => !deck.isMain).map(deck => deck.id);

                return (
                  <React.Fragment key={`average-row-${group.board}-${group.id}`}>
                    {displayMainOrSideColumn && (
                      <td className="p-0 bg-background relative sticky left-[180px] md:left-[258px] z-50">
                        <div className="p-1 bg-primary/20 flex items-center justify-center w-full h-[60px]">
                          {' ' /* Empty cell for the Main/Side indicator */}
                        </div>
                      </td>
                    )}
                    {/* Group divider cell */}
                    <td
                      className="p-1 bg-accent text-center relative"
                      onMouseEnter={() => setHoveredColumn(groupIndex * 100)}
                      onMouseLeave={() => setHoveredColumn(null)}
                    >
                      {/* Group average */}
                      {(() => {
                        // Use pre-computed group totals
                        const groupQuantities =
                          groupTotals?.[group.board === 1 ? 'mainDeck' : 'sideboard']?.[group.id]
                            ?.allTotals || [];

                        // Calculate average
                        const { avg, formatted: formattedAvg } = calculateAverage(groupQuantities);

                        // Calculate difference from main deck
                        const mainDeckTotal = groupQuantities[0]; // First deck is the main deck
                        const diff = avg - mainDeckTotal;

                        // If there's no significant difference, just show the average
                        if (Math.abs(diff) < 0.01) {
                          return <span>{formattedAvg}</span>;
                        }

                        // Determine text color based on diff
                        const textColorClass = getDiffColorClass(diff);

                        // Format the diff with a + sign if positive
                        const formattedDiff = formatDifference(diff, true);

                        // Render based on display mode
                        if (settings.diffDisplayMode === DiffDisplayMode.COUNT_ONLY) {
                          return (
                            <span className={textColorClass + ' font-medium'}>{formattedAvg}</span>
                          );
                        } else if (settings.diffDisplayMode === DiffDisplayMode.DIFF_ONLY) {
                          return (
                            <span className={textColorClass + ' font-medium'}>{formattedDiff}</span>
                          );
                        } else {
                          // Default: COUNT_AND_DIFF
                          return (
                            <span className={textColorClass + ' font-medium'}>
                              {formattedAvg} <span className="text-xs">({formattedDiff})</span>
                            </span>
                          );
                        }
                      })()}
                    </td>

                    {/* Card quantity cells */}
                    {groupCardIds.map((cardId, cardIndex) => {
                      const columnIndex = groupIndex * 100 + cardIndex + 1;

                      // Find card comparison data
                      const cardComparisonData = cardComparisons.find(
                        c => c.cardId === cardId && c.board === group.board,
                      );

                      if (!cardComparisonData) {
                        return (
                          <td
                            key={`average-row-${group.id}-${cardId}`}
                            className={cn('p-1 text-center min-w-[55px]', {
                              'bg-accent':
                                hoveredRow === 'average-row' || hoveredColumn === columnIndex,
                            })}
                            onMouseEnter={() => setHoveredColumn(columnIndex)}
                            onMouseLeave={() => setHoveredColumn(null)}
                          >
                            0
                          </td>
                        );
                      }

                      // Get quantities for all decks
                      const quantities = [
                        cardComparisonData.mainDeckQuantity,
                        ...otherDeckIds.map(
                          deckId => cardComparisonData.otherDecksQuantities[deckId] || 0,
                        ),
                      ];

                      // Calculate average
                      const { avg, formatted: formattedAvg } = calculateAverage(quantities);

                      // Calculate difference from main deck
                      const mainQty = cardComparisonData.mainDeckQuantity;
                      const diff = avg - mainQty;

                      // If there's no significant difference, just show the average
                      if (Math.abs(diff) < 0.01) {
                        return (
                          <td
                            key={`average-row-${group.id}-${cardId}`}
                            className={cn('p-1 text-center min-w-[55px]', {
                              'bg-accent':
                                hoveredRow === 'average-row' || hoveredColumn === columnIndex,
                            })}
                            onMouseEnter={() => setHoveredColumn(columnIndex)}
                            onMouseLeave={() => setHoveredColumn(null)}
                          >
                            {formattedAvg}
                          </td>
                        );
                      }

                      // Determine text color based on diff
                      const textColorClass = getDiffColorClass(diff);

                      // Format the diff with a + sign if positive
                      const formattedDiff = formatDifference(diff, true);

                      // Render based on display mode
                      let content;
                      if (settings.diffDisplayMode === DiffDisplayMode.COUNT_ONLY) {
                        content = (
                          <span className={textColorClass + ' font-medium'}>{formattedAvg}</span>
                        );
                      } else if (settings.diffDisplayMode === DiffDisplayMode.DIFF_ONLY) {
                        content = (
                          <span className={textColorClass + ' font-medium'}>{formattedDiff}</span>
                        );
                      } else {
                        // Default: COUNT_AND_DIFF
                        content = (
                          <span className={textColorClass + ' font-medium'}>
                            {formattedAvg} <span className="text-xs">({formattedDiff})</span>
                          </span>
                        );
                      }

                      return (
                        <td
                          key={`average-row-${group.id}-${cardId}`}
                          className={cn('p-1 text-center min-w-[55px]', {
                            'bg-accent':
                              hoveredRow === 'average-row' || hoveredColumn === columnIndex,
                          })}
                          onMouseEnter={() => setHoveredColumn(columnIndex)}
                          onMouseLeave={() => setHoveredColumn(null)}
                        >
                          {content}
                        </td>
                      );
                    })}
                  </React.Fragment>
                );
              })}

              {/* Total cell */}
              <td
                className="p-1 text-center bg-accent relative"
                onMouseEnter={() => setHoveredColumn(9999)}
                onMouseLeave={() => setHoveredColumn(null)}
              >
                {(() => {
                  // Use pre-computed deck totals
                  const preComputedDeckTotals = deckTotals?.allTotals || [];

                  // Calculate average
                  const { avg, formatted: formattedAvg } = calculateAverage(preComputedDeckTotals);

                  // Calculate difference from main deck
                  const mainDeckTotal = preComputedDeckTotals[0]; // First deck is the main deck
                  const diff = avg - mainDeckTotal;

                  // If there's no significant difference, just show the average
                  if (Math.abs(diff) < 0.01) {
                    return <span>{formattedAvg}</span>;
                  }

                  // Determine text color based on diff
                  const textColorClass = getDiffColorClass(diff);

                  // Format the diff with a + sign if positive
                  const formattedDiff = formatDifference(diff, true);

                  // Render based on display mode
                  if (settings.diffDisplayMode === DiffDisplayMode.COUNT_ONLY) {
                    return <span className={textColorClass + ' font-medium'}>{formattedAvg}</span>;
                  } else if (settings.diffDisplayMode === DiffDisplayMode.DIFF_ONLY) {
                    return <span className={textColorClass + ' font-medium'}>{formattedDiff}</span>;
                  } else {
                    // Default: COUNT_AND_DIFF
                    return (
                      <span className={textColorClass + ' font-medium'}>
                        {formattedAvg} <span className="text-xs">({formattedDiff})</span>
                      </span>
                    );
                  }
                })()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  // Default view: ViewMode.ROW_CARD
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
                    'absolute border-b -rotate-[20deg] bg-accent origin-left whitespace-nowrap transform -translate-x-[60px] -translate-y-[65px] truncate w-[500px] h-[300px] pt-[275px] pl-[20px]',
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
                      'absolute -rotate-[20deg] origin-left whitespace-nowrap transform translate-x-4 translate-y-[60px] truncate w-[300px]',
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

export default DeckComparerResult;
