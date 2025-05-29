import { Store, useStore } from '@tanstack/react-store';
import { DeckGroupBy, DeckLayout } from '../../../../../../types/enums.ts';

const getDefaultDeckLayout = () => {
  const layout = localStorage.getItem('deckLayout');
  if (layout) {
    if (Object.values(DeckLayout).includes(layout as DeckLayout)) {
      return layout as DeckLayout;
    }
  }
  return DeckLayout.TEXT;
};

const getDefaultDeckGroupBy = () => {
  const groupBy = localStorage.getItem('deckGroupBy');
  if (groupBy) {
    if (Object.values(DeckGroupBy).includes(groupBy as DeckGroupBy)) {
      return groupBy as DeckGroupBy;
    }
  }
  return DeckGroupBy.CARD_TYPE;
};

interface DeckLayoutStore {
  deckInfo: Record<
    string,
    | {
        format: number;
        owned: boolean;
      }
    | undefined
  >;
  layout: DeckLayout;
  groupBy: DeckGroupBy;
}

const defaultState: DeckLayoutStore = {
  deckInfo: {},
  layout: getDefaultDeckLayout(),
  groupBy: getDefaultDeckGroupBy(),
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

const setLayout = (layout: DeckLayout) => {
  localStorage.setItem('deckLayout', layout);
  store.setState(state => ({ ...state, layout }));
};

const setGroupBy = (groupBy: DeckGroupBy) => {
  localStorage.setItem('deckGroupBy', groupBy);
  store.setState(state => ({ ...state, groupBy }));
};

export function useDeckLayoutStore() {
  const layout = useStore(store, state => state.layout);
  const groupBy = useStore(store, state => state.groupBy);

  return { layout, groupBy };
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
    setLayout,
    setGroupBy,
    setDeckInfo: setDeckInfo,
  };
}
