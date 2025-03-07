import { Store, useStore } from '@tanstack/react-store';

interface DeckLayoutStore {
  deckInfo: Record<
    string,
    | {
        format: number;
        owned: boolean;
      }
    | undefined
  >;
}

const defaultState: DeckLayoutStore = {
  deckInfo: {},
};

const store = new Store<DeckLayoutStore>(defaultState);

const setDeckInfo = (deckId: string, format: number, owned: boolean) =>
  store.setState(state => ({
    ...state,
    deckInfo: {
      ...state.deckInfo,
      [deckId]: { format, owned },
    },
  }));

export function useDeckLayoutStore() {
  return {};
}

export function useDeckInfo(deckId: string) {
  return (
    useStore(store, state => state.deckInfo[deckId]) ?? {
      format: 1,
      owned: false,
    }
  );
}

export function useDeckLayoutStoreActions() {
  return {
    setDeckInfo: setDeckInfo,
  };
}
