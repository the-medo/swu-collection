import { Store, useStore } from '@tanstack/react-store';

export enum DeckLayout {
  TEXT = 'text',
  TEXT_CONDENSED = 'text-condensed',
  VISUAL_GRID = 'visual-grid',
  VISUAL_GRID_OVERLAP = 'visual-grid-overlap',
  VISUAL_STACKS = 'visual-stacks',
  VISUAL_STACKS_SPLIT = 'visual-stacks-split',
}

export enum DeckGroupBy {
  CARD_TYPE = 'card-type',
  COST = 'cost',
  ASPECT = 'aspect',
  TRAIT = 'trait',
  KEYWORDS = 'keywords',
}

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
