import { Store, useStore } from '@tanstack/react-store';

export enum CollectionLayout {
  IMAGE_BIG = 'image-big',
  IMAGE_SMALL = 'image-small',
  TABLE_SMALL = 'table-small',
  TABLE_IMAGE = 'table-image',
}

export enum CollectionGroupBy {
  RARITY = 'rarity',
  ASPECT_SOFT = 'aspect-soft',
  ASPECT_HARD = 'aspect-hard',
  CARD_TYPE = 'card_type',
  VARIANT_NAME = 'variant_name',
  SET = 'set',
  COST = 'cost',
}

export const GROUP_BY_OPTIONS = [
  { value: CollectionGroupBy.RARITY, label: 'Rarity' },
  { value: CollectionGroupBy.ASPECT_SOFT, label: 'Aspect (soft)' },
  { value: CollectionGroupBy.ASPECT_HARD, label: 'Aspect (hard)' },
  { value: CollectionGroupBy.CARD_TYPE, label: 'Card Type' },
  { value: CollectionGroupBy.VARIANT_NAME, label: 'Variant Name' },
  { value: CollectionGroupBy.SET, label: 'Set' },
  { value: CollectionGroupBy.COST, label: 'Cost' },
];
export type GroupByOptions = (typeof GROUP_BY_OPTIONS)[number];

export enum CollectionSortBy {
  CARD_TYPE = 'card_type',
  CARD_NAME = 'card_name',
  CARD_COST = 'card_cost',
  RARITY = 'rarity',
  ASPECT = 'aspect',
  VARIANT_NAME = 'variant_name',
}

export const SORT_BY_OPTIONS = [
  { value: CollectionSortBy.CARD_NAME, label: 'Name' },
  { value: CollectionSortBy.CARD_COST, label: 'Cost' },
  { value: CollectionSortBy.RARITY, label: 'Rarity' },
  { value: CollectionSortBy.ASPECT, label: 'Aspect' },
  { value: CollectionSortBy.CARD_TYPE, label: 'Card Type' },
  { value: CollectionSortBy.VARIANT_NAME, label: 'Variant Name' },
];
export type SortByOptions = (typeof SORT_BY_OPTIONS)[number];

interface CollectionLayoutStore {
  layout: CollectionLayout;
  collectionInfo: Record<
    string,
    | {
        currency: string;
        owned: boolean;
      }
    | undefined
  >;
  groupBy: CollectionGroupBy[];
  sortBy: CollectionSortBy[];
}

const defaultState: CollectionLayoutStore = {
  layout: CollectionLayout.TABLE_SMALL,
  collectionInfo: {},
  groupBy: [],
  sortBy: [CollectionSortBy.CARD_NAME],
};

const store = new Store<CollectionLayoutStore>(defaultState);

const setLayout = (layout: CollectionLayout) => store.setState(state => ({ ...state, layout }));
const setCollectionInfo = (collectionId: string, currency: string, owned: boolean) =>
  store.setState(state => ({
    ...state,
    collectionInfo: { ...state.collectionInfo, [collectionId]: { currency, owned } },
  }));
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

export function useCollectionInfo(collectionId: string) {
  return (
    useStore(store, state => state.collectionInfo[collectionId]) ?? { currency: '-', owned: false }
  );
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
    setCollectionInfo,
  };
}
