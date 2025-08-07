import { Store, useStore } from '@tanstack/react-store';

interface DeckInfoStore {
  deckInfo: Record<
    string,
    | {
        format: number;
        owned: boolean;
      }
    | undefined
  >;
}

const defaultState: DeckInfoStore = {
  deckInfo: {},
};

const store = new Store<DeckInfoStore>(defaultState);

const setDeckInfo = (deckId: string, format: number, owned: boolean) =>
  store.setState(state => ({
    ...state,
    deckInfo: {
      ...state.deckInfo,
      [deckId]: { format, owned },
    },
  }));

export function useDeckInfo(deckId: string) {
  return (
    useStore(store, state => state.deckInfo[deckId]) ?? {
      format: 1,
      owned: false,
    }
  );
}

export function useDeckInfoStoreActions() {
  return {
    setDeckInfo: setDeckInfo,
  };
}
