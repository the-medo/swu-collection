import type { CardList } from '../../../../../../../../lib/swu-resources/types.ts';
import { DeckCard } from '../../../../../../../../types/ZDeckCard.ts';
import {
  CardGroupData,
  CardGroups,
} from '@/components/app/collections/CollectionContents/CollectionGroups/lib/collectionGroupsLib.ts';
import { setArray, setInfo } from '../../../../../../../../lib/swu-resources/set-info.ts';
import { SwuSet } from '../../../../../../../../types/enums.ts';

export const groupCardsBySet = (cardList: CardList, cards: DeckCard[]): CardGroupData<DeckCard> => {
  const groups: CardGroups<DeckCard> = Object.fromEntries(
    setArray
      .sort((a, b) => a.sortValue - b.sortValue)
      .map(s => [
        s.code,
        {
          id: s.code,
          label: s.name,
          cards: [],
        },
      ]),
  );
  groups['unknown'] = {
    id: 'unknown',
    label: 'Unknown',
    cards: [],
  };

  cards.forEach(card => {
    const c = cardList[card.cardId];
    if (!c) return;
    let newestSet: SwuSet | undefined;
    Object.values(c.variants).forEach(v => {
      // Only check sets from Standard variants
      if (v?.variantName !== 'Standard' || !setInfo[v.set]) return;
      if (!newestSet) {
        newestSet = v.set;
      } else if (setInfo[newestSet].sortValue < setInfo[v.set].sortValue) {
        newestSet = v.set;
      }
    });
    groups[newestSet ?? 'unknown']?.cards.push(card);
  });

  return {
    groups,
    sortedIds: [
      ...[...setArray].sort((a, b) => a.sortValue - b.sortValue).map(s => s.code),
      'unknown',
    ],
  };
};
