import { Store, useStore } from '@tanstack/react-store';
import { CollectionCard } from '../../../../../../../types/CollectionCard.ts';
import { CardGroupData } from './lib/collectionGroupsLib.ts';

// Define the store interface
interface CollectionGroupStore {
  // Loading state
  loading: boolean;
  
  // Groups data (id, card count, sub groups, level)
  groups: Record<string, CardGroupData>;
  
  // Collection cards mapped by their keys
  collectionCards: Record<string, CollectionCard>;
  
  // Group cards - groupIds mapped to sorted array of collectionCard keys
  groupCards: Record<string, string[]>;
}

// Default state
const defaultState: CollectionGroupStore = {
  loading: false,
  groups: {},
  collectionCards: {},
  groupCards: {},
};

// Create the store
const store = new Store<CollectionGroupStore>(defaultState);

// Actions to update the store
const setLoading = (loading: boolean) =>
  store.setState(state => ({ ...state, loading }));

const setGroups = (collectionId: string, groups: CardGroupData) =>
  store.setState(state => ({
    ...state,
    groups: {
      ...state.groups,
      [collectionId]: groups,
    },
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

const clearStore = () =>
  store.setState(() => defaultState);

// Hook to access the store state
export function useCollectionGroupStore() {
  const loading = useStore(store, state => state.loading);
  const groups = useStore(store, state => state.groups);
  const collectionCards = useStore(store, state => state.collectionCards);
  const groupCards = useStore(store, state => state.groupCards);

  return {
    loading,
    groups,
    collectionCards,
    groupCards,
  };
}

// Hook to access a specific collection's group data
export function useCollectionGroup(collectionId: string) {
  return useStore(store, state => state.groups[collectionId]);
}

// Hook to access a specific group's card keys
export function useGroupCards(groupId: string) {
  return useStore(store, state => state.groupCards[groupId] || []);
}

// Hook to access a specific collection card
export function useCollectionCard(cardKey: string) {
  return useStore(store, state => state.collectionCards[cardKey]);
}

// Hook to access the store actions
export function useCollectionGroupStoreActions() {
  return {
    setLoading,
    setGroups,
    setCollectionCards,
    updateCollectionCard,
    setGroupCards,
    clearStore,
  };
}