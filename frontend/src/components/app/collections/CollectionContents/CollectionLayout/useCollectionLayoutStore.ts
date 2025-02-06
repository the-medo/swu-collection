import { Store, useStore } from '@tanstack/react-store';

export enum CollectionLayout {
  IMAGE_BIG = 'image-big',
  IMAGE_SMALL = 'image-small',
  TABLE_SMALL = 'table-small',
  TABLE_IMAGE = 'table-image',
}

export enum CollectionGroupBy {
  RARITY = 'rarity',
  ASPECT = 'aspect',
  CARD_TYPE = 'card_type',
  VERSION_NAME = 'version_name',
}

export enum CollectionSortBy {
  CARD_TYPE = 'card_type',
  CARD_NAME = 'card_name',
  CARD_COST = 'card_cost',
  RARITY = 'rarity',
  ASPECT = 'aspect',
  VERSION_NAME = 'version_name',
}

interface CollectionLayoutStore {
  layout: CollectionLayout;
  groupBy: CollectionGroupBy[];
  sortBy: CollectionSortBy[];
}

const defaultState: CollectionLayoutStore = {
  layout: CollectionLayout.TABLE_SMALL,
  groupBy: [],
  sortBy: [],
};

const store = new Store<CollectionLayoutStore>(defaultState);

const setLayout = (layout: CollectionLayout) => store.setState(state => ({ ...state, layout }));
const addGroupBy = (newGroupBy: CollectionGroupBy) =>
  store.setState(state => {
    if (state.groupBy.includes(newGroupBy)) return state;
    return { ...state, groupBy: [...state.groupBy, newGroupBy] };
  });
const removeGroupBy = (removedGroupBy: CollectionGroupBy) =>
  store.setState(state => {
    return { ...state, groupBy: state.groupBy.filter(g => g !== removedGroupBy) };
  });
const changeGroupBy = (changedGroupBy: CollectionGroupBy, index: number) =>
  store.setState(state => {
    return { ...state, groupBy: state.groupBy.map((g, i) => (i === index ? changedGroupBy : g)) };
  });
const addSortBy = (newSortBy: CollectionSortBy) =>
  store.setState(state => {
    if (state.sortBy.includes(newSortBy)) return state;
    return { ...state, sortBy: [...state.sortBy, newSortBy] };
  });
const removeSortBy = (removedSortBy: CollectionSortBy) =>
  store.setState(state => {
    return { ...state, sortBy: state.sortBy.filter(s => s !== removedSortBy) };
  });
const changeSortBy = (changedSortBy: CollectionSortBy, index: number) =>
  store.setState(state => {
    return { ...state, sortBy: state.sortBy.map((s, i) => (i === index ? changedSortBy : s)) };
  });

export function useCollectionLayoutStore() {
  const layout = useStore(store, state => state.layout);
  const groupBy = useStore(store, state => state.groupBy);
  const sortBy = useStore(store, state => state.sortBy);

  return {
    layout,
    groupBy,
    sortBy,
  };
}

export function useCollectionLayoutStoreActions() {
  return {
    setLayout,
    addGroupBy,
    removeGroupBy,
    changeGroupBy,
    addSortBy,
    removeSortBy,
    changeSortBy,
  };
}
