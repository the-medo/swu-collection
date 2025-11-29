import { Store, useStore } from '@tanstack/react-store';

interface DeckInfoStore {
  deckInfo: Record<
    string,
    | {
        format: number;
        owned: boolean;
        editable: boolean;
        cardPoolId?: string | null;
      }
    | undefined
  >;
}

const defaultState: DeckInfoStore = {
  deckInfo: {},
};

const store = new Store<DeckInfoStore>(defaultState);

const setDeckInfo = (deckId: string, format: number, owned: boolean, cardPoolId?: string | null) =>
  store.setState(state => ({
    ...state,
    deckInfo: {
      ...state.deckInfo,
      [deckId]: { format, owned, editable: owned && !cardPoolId, cardPoolId },
    },
  }));

export function useDeckInfo(deckId: string) {
  return (
    useStore(store, state => state.deckInfo[deckId]) ?? {
      format: 1,
      owned: false,
      editable: false,
      cardPoolId: undefined,
    }
  );
}

export function useDeckInfoStoreActions() {
  return {
    setDeckInfo: setDeckInfo,
  };
}
