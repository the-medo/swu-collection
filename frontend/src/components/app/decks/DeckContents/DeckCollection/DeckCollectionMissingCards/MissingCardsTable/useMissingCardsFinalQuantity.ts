import { useEffect } from 'react';
import { MissingCardsRowData } from './missingCardsTableLib.ts';
import {
  DeckMissingCardsStoreFinalQuantity,
  useDeckMissingCardsStore,
  useDeckMissingCardsStoreActions,
} from '@/components/app/decks/DeckContents/DeckCollection/useDeckMissingCardsStore.ts';

// Computes and updates finalQuantity in the store based on rows and store settings.
// quantity and originalQuantity are set equal to the computed value so that
// user overrides (changed=true) can be preserved by replaceFinalQuantityExceptChanged.
export const useMissingCardsFinalQuantity = (rows: MissingCardsRowData[]) => {
  // Read flags from the store
  const countCollectionsForDecks = useDeckMissingCardsStore('countCollectionsForDecks');
  const countCollectionsNotForDecks = useDeckMissingCardsStore('countCollectionsNotForDecks');
  const countWantlists = useDeckMissingCardsStore('countWantlists');
  const countOtherLists = useDeckMissingCardsStore('countOtherLists');

  const { replaceFinalQuantityExceptChanged, resetDeckMissingCardsStore } =
    useDeckMissingCardsStoreActions();

  useEffect(() => {
    const map: DeckMissingCardsStoreFinalQuantity = {};

    for (const row of rows ?? []) {
      const owned = row.ownedQuantity;
      const forDecks = countCollectionsForDecks ? (owned?.deckCollection ?? 0) : 0;
      const nonDecks = countCollectionsNotForDecks ? (owned?.nonDeckCollection ?? 0) : 0;
      const wantlists = countWantlists ? (owned?.wantlist ?? 0) : 0;
      const otherLists = countOtherLists ? (owned?.cardlist ?? 0) : 0;

      const subtractTotal = forDecks + nonDecks + wantlists + otherLists;
      const computed = Math.max(0, (row.quantity ?? 0) - subtractTotal);

      map[row.cardId] = {
        quantity: computed,
        originalQuantity: computed,
        changed: false,
      };
    }

    replaceFinalQuantityExceptChanged(map);

    return () => {
      resetDeckMissingCardsStore();
    };
  }, [
    rows,
    countCollectionsForDecks,
    countCollectionsNotForDecks,
    countWantlists,
    countOtherLists,
    replaceFinalQuantityExceptChanged,
  ]);
};
