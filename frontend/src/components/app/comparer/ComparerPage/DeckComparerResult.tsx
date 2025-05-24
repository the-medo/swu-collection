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
import DeckColumnMenu from './DeckColumnMenu';

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
      <div className="flex items-center justify-between gap-2 max-w-[172px] md:max-w-[242px] overflow-hidden">
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

    // Calculate total cards for each deck
    const mainDeckTotal = cards.reduce((sum, card) => sum + card.mainDeckQuantity, 0);
    const otherDeckTotals: Record<string, number> = {};

    otherDeckEntries.forEach(entry => {
      otherDeckTotals[entry.id] = cards.reduce(
        (sum, card) => sum + (card.otherDecksQuantities[entry.id] || 0),
        0,
      );
    });

    return (
      <React.Fragment key={groupName}>
        <tr className="border-t bg-accent">
          <td className="p-1 font-medium pt-8 sticky left-0 z-10 bg-accent">{groupName}</td>
          <td className="text-center text-lg bg-accent font-semibold pt-8 sticky min-w-[55px] left-[180px] md:left-[250px] z-10">
            <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-border"></div>
            {mainDeckTotal}
          </td>
          {otherDeckEntries.map(entry => (
            <td key={entry.id} className="p-1 text-center w-20 font-semibold pt-8">
              {renderQuantityDifference(mainDeckTotal, otherDeckTotals[entry.id])}
            </td>
          ))}
        </tr>
        {cards.map(card => (
          <tr key={card.cardId} className="border-t">
            <td className="p-1 sticky left-0 z-10 bg-background">{renderCardName(card.cardId)}</td>
            <td className="text-center text-lg bg-accent font-semibold sticky left-[180px] md:left-[250px] z-10">
              <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-border"></div>
              {card.mainDeckQuantity}
            </td>
            {otherDeckEntries.map(entry => (
              <td key={entry.id} className="p-1 text-center min-w-[55px]">
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

  const renderSectionTitleRow = (sectionRowTitle: string) => {
    return (
      <tr className="sticky top-[140px] z-50 bg-background">
        <td className="font-semibold bg-background text-lg sticky left-0 top-[140px] z-50 p-0">
          <div className="h-full w-full flex items-center justify-center bg-primary/20 p-2">
            {sectionRowTitle}
          </div>
          <div className="absolute right-0 left-0 bottom-0 h-[2px] bg-border"></div>
        </td>
        <td className="text-center sticky bg-background left-[180px] md:left-[250px] z-50 p-0">
          <div className="h-full w-full flex items-center justify-center bg-primary/20 p-2">
            <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-border"></div>
            <div className="absolute right-0 left-0 bottom-0 h-[2px] bg-border"></div>
            <DeckColumnMenu deckId={mainDeckId} isMainDeck={true} />
          </div>
        </td>

        {otherDeckEntries.map(entry => (
          <td key={entry.id} className="text-center bg-primary/20">
            <div className="absolute right-0 left-0 bottom-0 h-[2px] bg-border"></div>
            <DeckColumnMenu deckId={entry.id} isMainDeck={false} />
          </td>
        ))}
      </tr>
    );
  };

  return (
    <div className="overflow-auto max-h-[80vh]">
      <table className="border-collapse relative">
        <thead className="h-[140px] sticky top-0 z-30 bg-background">
          <tr className="">
            <th className="p-2 text-left w-20 sticky left-0 z-30 bg-background"></th>
            <th className="p-2 text-center w-16 relative sticky  left-[180px] md:left-[250px] z-10 bg-background">
              <div className="flex items-center">
                <div className="absolute border-b -rotate-[20deg] bg-accent origin-left whitespace-nowrap transform -translate-x-[60px] -translate-y-[65px] truncate w-[500px] h-[300px] pt-[275px] pl-[20px]">
                  {mainDeckData?.deck?.name || 'Main Deck'}
                </div>
              </div>
            </th>
            {otherDeckEntries.map(entry => (
              <th key={entry.id} className="p-2 text-center w-16 relative">
                <div className="flex items-center">
                  <div className="absolute -rotate-[20deg] origin-left whitespace-nowrap transform translate-x-4 translate-y-[60px] truncate w-[300px]">
                    {entry.additionalData?.title || 'Other Deck'}
                  </div>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {renderSectionTitleRow('Main Deck')}
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

          {/* Sideboard Section */}
          {groupedCards?.sideboard.sortedIds?.some(groupName => {
            const group = groupedCards.sideboard.groups[groupName];
            return group && group.cards.length > 0;
          }) && (
            <>
              {renderSectionTitleRow('Sideboard')}
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
            </>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DeckComparerResult;
