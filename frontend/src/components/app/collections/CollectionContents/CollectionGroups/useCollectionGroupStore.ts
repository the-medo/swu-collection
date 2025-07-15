import { Store, useStore } from '@tanstack/react-store';
import { CollectionCard } from '../../../../../../../types/CollectionCard.ts';

export interface CardGroupInfoData {
  id: string;
  label?: string;
  cardCount: number;
  subGroupIds: string[];
  level: number;
}

export type CardGroupInfo = Record<string, CardGroupInfoData>;

// Define the store interface
interface CollectionGroupStore {
  // Loading state
  loading: boolean;

  // Groups data (id, card count, sub groups, level)
  groupInfo: CardGroupInfo;

  // Collection cards mapped by their keys
  collectionCards: Record<string, CollectionCard>;

  // Group cards - groupIds mapped to sorted array of collectionCard keys
  groupCards: Record<string, string[]>;
}

// Default state
const defaultState: CollectionGroupStore = {
  loading: false,
  groupInfo: {},
  collectionCards: {},
  groupCards: {},
};

// Create the store
const store = new Store<CollectionGroupStore>(defaultState);

// Actions to update the store
const setLoading = (loading: boolean) => store.setState(state => ({ ...state, loading }));

const setCollectionStoreData = (data: Omit<CollectionGroupStore, 'loading'>) =>
  store.setState(state => ({
    loading: state.loading,
    ...data,
  }));

const setCollectionCards = (cards: Record<string, CollectionCard>) =>
  store.setState(state => ({
    ...state,
    collectionCards: {
      ...state.collectionCards,
      ...cards,
    },
  }));

const updateCollectionCard = (key: string, card: CollectionCard) =>
  store.setState(state => ({
    ...state,
    collectionCards: {
      ...state.collectionCards,
      [key]: card,
    },
  }));

const setGroupCards = (groupId: string, cardKeys: string[]) =>
  store.setState(state => ({
    ...state,
    groupCards: {
      ...state.groupCards,
      [groupId]: cardKeys,
    },
  }));

const setGroupInfo = (groupId: string, info: CardGroupInfoData) =>
  store.setState(state => ({
    ...state,
    groupInfo: {
      ...state.groupInfo,
      [groupId]: info,
    },
  }));

const clearStore = () => store.setState(() => defaultState);

// Hook to access the store state
export function useCollectionGroupStore() {
  const loading = useStore(store, state => state.loading);
  const groupInfo = useStore(store, state => state.groupInfo);
  const collectionCards = useStore(store, state => state.collectionCards);
  const groupCards = useStore(store, state => state.groupCards);

  return {
    loading,
    groupInfo,
    collectionCards,
    groupCards,
  };
}

// Hook to access a specific group's card keys
export function useGroupCards(groupId: string) {
  return useStore(store, state => state.groupCards[groupId] || []);
}

// Hook to access a specific collection card
export function useCollectionCard(cardKey: string) {
  return useStore(store, state => state.collectionCards[cardKey]);
}

// Hook to access a specific group's info
export function useCollectionGroupInfo(groupId: string) {
  return useStore(store, state => state.groupInfo[groupId]);
}

// Hook to access the store actions
export function useCollectionGroupStoreActions() {
  return {
    setCollectionStoreData,
    setLoading,
    setCollectionCards,
    updateCollectionCard,
    setGroupCards,
    setGroupInfo,
    clearStore,
  };
}
