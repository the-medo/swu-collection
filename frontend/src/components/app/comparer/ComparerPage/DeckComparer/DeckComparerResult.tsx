import * as React from 'react';
import { useMemo } from 'react';
import { useComparerStore } from '@/components/app/comparer/useComparerStore.ts';
import { queryClient } from '@/queryClient.ts';
import { DeckCard } from '../../../../../../../types/ZDeckCard.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import { groupCardsByCardType } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/groupCardsByCardType.ts';
import { groupCardsByCost } from '@/components/app/decks/DeckContents/DeckCards/lib/groupCardsByCost.ts';
import { groupCardsByAspect } from '@/components/app/decks/DeckContents/DeckCards/lib/groupCardsByAspect.ts';
import { groupCardsByTrait } from '@/components/app/decks/DeckContents/DeckCards/lib/groupCardsByTrait.ts';
import { groupCardsByKeywords } from '@/components/app/decks/DeckContents/DeckCards/lib/groupCardsByKeywords.ts';
import { CardComparisonData } from '../types.ts';
import { useGetDeck } from '@/api/decks/useGetDeck.ts';
import { useGetDeckCards } from '@/api/decks/useGetDeckCards.ts';
import ViewRowDeck from './ViewRowDeck';
import ViewRowCard from './ViewRowCard';
import {
  DeckComparerCardGroup,
  DeckComparerDeck,
  DeckComparerTotalsMap,
} from '@/components/app/comparer/ComparerPage/DeckComparer/types.ts';
import { DeckGroupBy, ViewMode } from '../../../../../../../types/enums.ts';

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
      mainDeck: {} as DeckComparerTotalsMap,
      sideboard: {} as DeckComparerTotalsMap,
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
    const allDecks: DeckComparerDeck[] = [
      { id: mainDeckId, name: mainDeckData?.deck?.name || 'Main Deck', isMain: true },
      ...otherDeckEntries.map(entry => ({
        id: entry.id,
        name: entry.additionalData?.title || 'Other Deck',
        isMain: false,
      })),
    ];

    // Get all card groups from both main deck and sideboard
    const allCardGroups: DeckComparerCardGroup[] = [
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

    return (
      <ViewRowDeck
        allDecks={allDecks}
        allCardGroups={allCardGroups}
        cardListData={cardListData}
        cardComparisons={cardComparisons}
        groupTotals={groupTotals}
        deckTotals={deckTotals}
        settings={settings}
      />
    );
  }

  // Default view: ViewMode.ROW_CARD
  return (
    <ViewRowCard
      mainDeckId={mainDeckId}
      mainDeckData={mainDeckData}
      otherDeckEntries={otherDeckEntries}
      cardListData={cardListData}
      cardComparisons={cardComparisons}
      groupedCards={groupedCards}
      groupTotals={groupTotals}
      settings={settings}
    />
  );
};

export default DeckComparerResult;
