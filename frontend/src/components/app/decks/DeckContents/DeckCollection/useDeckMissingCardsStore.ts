import { Store, useStore } from '@tanstack/react-store';

export type DeckMissingCardsStoreFinalQuantity = Record<
  string,
  { quantity: number; originalQuantity: number; changed: boolean } | undefined
>;

interface DeckMissingCardsStore {
  countCollectionsForDecks: boolean;
  countCollectionsNotForDecks: boolean;
  countWantlists: boolean;
  countOtherLists: boolean;
  finalQuantity: DeckMissingCardsStoreFinalQuantity;
}

const defaultState: DeckMissingCardsStore = {
  countCollectionsForDecks: true,
  countCollectionsNotForDecks: false,
  countWantlists: false,
  countOtherLists: false,
  finalQuantity: {},
};

const store = new Store<DeckMissingCardsStore>(defaultState);

const setDeckMissingCardsStore = (
  key: keyof Omit<DeckMissingCardsStore, 'finalQuantity'>,
  value: boolean,
) =>
  store.setState(state => ({
    ...state,
    [key]: value,
  }));

export function useDeckMissingCardsStore(key: keyof Omit<DeckMissingCardsStore, 'finalQuantity'>) {
  return useStore(store, state => state[key]);
}

export function useDeckMissingCardsFinalQuantity(cardId: string) {
  return useStore(store, state => state.finalQuantity[cardId]);
}

function replaceFinalQuantityExceptChanged(newMap: DeckMissingCardsStoreFinalQuantity) {
  store.setState(state => {
    const result: DeckMissingCardsStoreFinalQuantity = {};

    // Gather all keys from current and new map
    const keys = new Set<string>([
      ...Object.keys(state.finalQuantity ?? {}),
      ...Object.keys(newMap ?? {}),
    ]);

    keys.forEach(id => {
      const current = state.finalQuantity[id];
      const incoming = newMap[id];

      if (current?.changed) {
        // Preserve current.quantity and changed=true, but update originalQuantity if provided
        const originalQuantity =
          incoming?.originalQuantity ?? incoming?.quantity ?? current.originalQuantity ?? 0;
        result[id] = {
          quantity: current.quantity,
          originalQuantity,
          changed: true,
        };
      } else if (incoming) {
        // Take incoming fully; if changed not provided, default to false
        result[id] = {
          quantity: incoming.quantity,
          originalQuantity:
            incoming.originalQuantity ?? incoming.quantity,
          changed: incoming.changed ?? false,
        };
      } else if (current) {
        // No incoming for this id; keep current as-is (not changed)
        result[id] = { ...current };
      } else {
        result[id] = undefined;
      }
    });

    return { ...state, finalQuantity: result };
  });
}

function setSingleFinalQuantity(cardId: string, quantity: number) {
  store.setState(state => {
    const current = state.finalQuantity[cardId];
    const originalQuantity = current?.originalQuantity ?? current?.quantity ?? 0;
    return {
      ...state,
      finalQuantity: {
        ...state.finalQuantity,
        [cardId]: {
          quantity,
          originalQuantity,
          changed: true,
        },
      },
    };
  });
}

function resetFinalQuantityState() {
  store.setState(state => {
    const result: DeckMissingCardsStoreFinalQuantity = {};
    for (const [id, entry] of Object.entries(state.finalQuantity)) {
      if (!entry) {
        result[id] = undefined;
        continue;
      }
      const original = entry.originalQuantity ?? entry.quantity ?? 0;
      result[id] = {
        quantity: original,
        originalQuantity: original,
        changed: false,
      };
    }
    return { ...state, finalQuantity: result };
  });
}

function resetDeckMissingCardsStore() {
  store.setState(() => ({ ...defaultState }));
}

function resetSingleCardFinalQuantityState(cardId: string) {
  store.setState(state => {
    const current = state.finalQuantity[cardId];
    if (!current) {
      // nothing to reset
      return state;
    }
    const original = current.originalQuantity ?? current.quantity ?? 0;
    return {
      ...state,
      finalQuantity: {
        ...state.finalQuantity,
        [cardId]: {
          quantity: original,
          originalQuantity: original,
          changed: false,
        },
      },
    };
  });
}

export function useDeckMissingCardsStoreActions() {
  return {
    setDeckMissingCardsStore,
    replaceFinalQuantityExceptChanged,
    setSingleFinalQuantity,
    resetFinalQuantityState,
    resetSingleCardFinalQuantityState,
    resetDeckMissingCardsStore,
  };
}
