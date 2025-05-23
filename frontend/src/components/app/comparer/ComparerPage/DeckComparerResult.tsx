import * as React from 'react';
import { useMemo } from 'react';
import { useComparerStore } from '@/components/app/comparer/useComparerStore';
import { queryClient } from '@/queryClient.ts';
import { DeckCard } from '../../../../../../types/ZDeckCard';
import { useCardList } from '@/api/lists/useCardList';
import CostIcon from '@/components/app/global/icons/CostIcon';
import AspectIcon from '@/components/app/global/icons/AspectIcon';
import { groupCardsByCardType } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/groupCardsByCardType';
import { CardComparisonData } from './types';

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
  // Get main deck data and cards from cache
  const mainDeckData = queryClient.getQueryData<any>(['deck', mainDeckId]);
  const mainDeckCards = queryClient.getQueryData<{ data: DeckCard[] }>([
    'deck-content',
    mainDeckId,
  ]);

  // Get card list data
  const { data: cardListData } = useCardList();

  // Create a map of all cards across all decks
  const cardComparisonMap = useMemo(() => {
    const comparisonMap = new Map<string, CardComparisonData>();

    // Process main deck cards
    if (mainDeckCards?.data && cardListData) {
      mainDeckCards.data.forEach(card => {
        const cardData = cardListData.cards[card.cardId];
        comparisonMap.set(card.cardId, {
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
          const existingCard = comparisonMap.get(card.cardId);
          const cardData = cardListData.cards[card.cardId];

          if (existingCard) {
            // Card exists in main deck, update other deck quantity
            existingCard.otherDecksQuantities[deckId] = card.quantity;
          } else {
            // Card doesn't exist in main deck, add it
            comparisonMap.set(card.cardId, {
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

    const mainDeckGroups = groupCardsByCardType(cardListData.cards, mainDeckCards);
    const sideboardGroups = groupCardsByCardType(cardListData.cards, sideboardCards);

    return {
      mainDeck: mainDeckGroups,
      sideboard: sideboardGroups,
    };
  }, [cardComparisons, cardListData, mainDeckId]);

  // Count cards that are in main deck but not in other decks
  const uniqueToMainDeck = cardComparisons.filter(
    card =>
      card.mainDeckQuantity > 0 && Object.values(card.otherDecksQuantities).every(qty => qty === 0),
  ).length;

  // Count cards that are in other decks but not in main deck
  const notInMainDeck = cardComparisons.filter(
    card =>
      card.mainDeckQuantity === 0 && Object.values(card.otherDecksQuantities).some(qty => qty > 0),
  ).length;

  // Render quantity difference with color
  const renderQuantityDifference = (mainQty: number, otherQty: number) => {
    const diff = otherQty - mainQty;

    if (diff === 0) {
      return <span>{otherQty}</span>;
    } else if (diff > 0) {
      return (
        <span className="text-green-600 font-medium">
          {otherQty} <span className="text-xs">(+{diff})</span>
        </span>
      );
    } else {
      return (
        <span className="text-red-600 font-medium">
          {otherQty} <span className="text-xs">({diff})</span>
        </span>
      );
    }
  };

  // Render card name with cost
  const renderCardName = (cardId: string) => {
    if (!cardListData) return cardId;

    const card = cardListData.cards[cardId];
    if (!card) return cardId;

    return (
      <div className="flex items-center justify-between gap-2 max-w-[250px]">
        <span className="truncate">{card.name}</span>
        <div className="flex gap-0 ml-1">
          {card.cost !== null ? <CostIcon cost={card.cost} size="xSmall" /> : null}
          {card.aspects?.map((aspect, i) => (
            <AspectIcon key={`${aspect}${i}`} aspect={aspect} size="xSmall" />
          ))}
        </div>
      </div>
    );
  };

  // Render a section of cards by type
  const renderCardsByType = (groupName: string, cards: CardComparisonData[]) => {
    if (!cards.length) return null;

    return (
      <React.Fragment key={groupName}>
        <tr className="bg-accent">
          <td colSpan={2 + otherDeckEntries.length + 1} className="p-2 font-medium pt-8">
            {groupName} ({cards.reduce((sum, card) => sum + card.mainDeckQuantity, 0)})
          </td>
        </tr>
        {cards.map(card => (
          <tr key={card.cardId} className="border-t">
            <td className="p-1">{renderCardName(card.cardId)}</td>
            <td className="text-center text-lg bg-accent font-semibold">{card.mainDeckQuantity}</td>
            {otherDeckEntries.map(entry => (
              <td key={entry.id} className="p-1 text-center w-20">
                {renderQuantityDifference(
                  card.mainDeckQuantity,
                  card.otherDecksQuantities[entry.id] || 0,
                )}
              </td>
            ))}
          </tr>
        ))}
      </React.Fragment>
    );
  };

  return (
    <div className="p-4 border rounded-md">
      <h3 className="text-lg font-semibold mb-4">Deck Comparison</h3>

      {/* Main Deck */}
      <div className="overflow-x-auto mb-8">
        <h4 className="text-md font-semibold mb-2">Main Deck</h4>
        <table className="border-collapse">
          <thead className="h-[200px]">
            <tr className="bg-gray-100">
              <th className="p-2 text-left w-20">Card</th>
              <th className="p-2 text-center w-16 relative">
                <div className="absolute -rotate-45 origin-left whitespace-nowrap transform translate-x-4 translate-y-[80px]">
                  {mainDeckData?.deck?.name || 'Main Deck'}
                </div>
              </th>
              {otherDeckEntries.map(entry => (
                <th key={entry.id} className="p-2 text-center w-16 relative">
                  <div className="absolute -rotate-45 origin-left whitespace-nowrap transform translate-x-4 translate-y-[80px]">
                    {entry.additionalData?.title || 'Other Deck'}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groupedCards?.mainDeck.sortedIds?.map(groupName => {
              const group = groupedCards.mainDeck.groups[groupName];
              if (!group || !group.cards.length) return null;

              // Find the corresponding card comparison data for each card in the group
              const cardsInGroup = group.cards
                .map(card => {
                  return cardComparisons.find(c => c.cardId === card.cardId && c.board === 1);
                })
                .filter(Boolean) as CardComparisonData[];

              return renderCardsByType(group.label, cardsInGroup);
            })}
          </tbody>
        </table>
      </div>

      {/* Sideboard */}
      {groupedCards?.sideboard.sortedIds?.some(groupName => {
        const group = groupedCards.sideboard.groups[groupName];
        return group && group.cards.length > 0;
      }) && (
        <div className="overflow-x-auto">
          <h4 className="text-md font-semibold mb-2">Sideboard</h4>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left">Card</th>
                <th className="p-2 text-center w-16 relative">
                  <div className="absolute -rotate-45 origin-left whitespace-nowrap transform translate-x-4 -translate-y-2">
                    {mainDeckData?.deck?.name || 'Main Deck'}
                  </div>
                </th>
                {otherDeckEntries.map(entry => (
                  <th key={entry.id} className="p-2 text-center w-16 relative">
                    <div className="absolute -rotate-45 origin-left whitespace-nowrap transform translate-x-4 -translate-y-2">
                      {entry.additionalData?.title || 'Other Deck'}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groupedCards?.sideboard.sortedIds?.map(groupName => {
                const group = groupedCards.sideboard.groups[groupName];
                if (!group || !group.cards.length) return null;

                // Find the corresponding card comparison data for each card in the group
                const cardsInGroup = group.cards
                  .map(card => {
                    return cardComparisons.find(c => c.cardId === card.cardId && c.board === 2);
                  })
                  .filter(Boolean) as CardComparisonData[];

                return renderCardsByType(group.label, cardsInGroup);
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DeckComparerResult;
