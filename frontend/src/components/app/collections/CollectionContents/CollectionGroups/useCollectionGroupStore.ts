import { Store, useStore } from '@tanstack/react-store';
import { CollectionCard } from '../../../../../../../types/CollectionCard.ts';
import {
  CardDataWithVariants,
  type CardListVariants,
  type CardVariant,
} from '../../../../../../../lib/swu-resources/types.ts';

export interface CardGroupInfoData {
  id: string;
  label?: string;
  cardCount: number;
  subGroupIds: string[];
  level: number;
}

export type CollectionCardExtended = {
  collectionCard: CollectionCard;
  card?: CardDataWithVariants<CardListVariants>;
  variant?: CardVariant;
};

export type CardGroupInfo = Record<string, CardGroupInfoData>;

// Define the store interface
interface CollectionGroupStore {
  // Loading state
  loading: boolean;
  loadedCollectionId?: string;
  forceRefreshId?: string;

  // Groups data (id, card count, sub groups, level)
  groupInfo: CardGroupInfo;

  // Collection cards mapped by their keys
  collectionCards: Record<string, CollectionCardExtended>;

  // Group cards - groupIds mapped to sorted array of collectionCard keys
  groupCards: Record<string, string[]>;
}

// Default state
const defaultState: CollectionGroupStore = {
  loading: false,
  loadedCollectionId: undefined,
  forceRefreshId: Date.now().toString(),
  groupInfo: {},
  collectionCards: {},
  groupCards: {},
};

// Create the store
const store = new Store<CollectionGroupStore>(defaultState);

// Actions to update the store
const setLoading = (loading: boolean) => store.setState(state => ({ ...state, loading }));
const setLoadedCollectionId = (id: string) =>
  store.setState(state => ({ ...state, loadedCollectionId: id }));

const setCollectionStoreData = (
  data: Omit<CollectionGroupStore, 'loading' | 'loadedCollectionId'>,
) =>
  store.setState(state => {
    /**
     * I want to keep reference to the same "collectionCards" object,
     * so hook useCollectionGroupData can work with newest version of it without it being in dependencies,
     * thats why state.collectionCards is used directly
     */
    Object.keys(state.collectionCards || {}).forEach(cardKey => {
      if (!data.collectionCards[cardKey]) {
        delete state.collectionCards[cardKey];
      } else {
        state.collectionCards[cardKey] = data.collectionCards[cardKey];
      }
    });
    Object.keys(data.collectionCards || {}).forEach(cardKey => {
      if (!state.collectionCards[cardKey]) {
        state.collectionCards[cardKey] = data.collectionCards[cardKey];
      }
    });

    console.log(data.collectionCards, state.collectionCards);
    return {
      loading: state.loading,
      loadedCollectionId: state.loadedCollectionId,
      ...data,
      collectionCards: state.collectionCards,
    };
  });

/**
 * Merges new data into the existing store data
 * 1. Merges groupInfo by adding new groups or updating existing ones with missing subGroupIds
 * 2. Merges collectionCards by adding new cards or updating existing ones (amount, note, price)
 * 3. Merges groupCards by adding new groups or adding elements to existing groups
 * 4. Updates cardCount for each group based on the number of records in groupCards
 */
const mergeToCollectionStoreData = (data: Omit<CollectionGroupStore, 'loading'>) =>
  store.setState(state => {
    // 1. Merge groupInfo
    let mergedGroupInfo: CardGroupInfo = { ...data.groupInfo, ...state.groupInfo };

    // Add new groups or update existing ones
    Object.entries(data.groupInfo || {}).forEach(([groupId, groupData]) => {
      if (mergedGroupInfo[groupId]) {
        // If group exists, add missing subGroupIds
        const existingSubGroupIds = new Set(mergedGroupInfo[groupId].subGroupIds);
        groupData.subGroupIds.forEach(subGroupId => {
          if (!existingSubGroupIds.has(subGroupId)) {
            existingSubGroupIds.add(subGroupId);
          }
        });
        mergedGroupInfo[groupId].subGroupIds = [...existingSubGroupIds];
      }
    });

    /**
     * 2. Merge collectionCards - i want to keep reference to the same "collectionCards" object,
     * so hook useCollectionGroupData can work with newest version of it without it being in dependencies
     */
    const mergedCollectionCards: Record<string, CollectionCardExtended> = state.collectionCards;

    // Add new cards or update existing ones
    Object.entries(data.collectionCards || {}).forEach(([cardKey, cardData]) => {
      if (!mergedCollectionCards[cardKey]) {
        // Add new card if it doesn't exist
        mergedCollectionCards[cardKey] = { ...cardData };
      } else {
        // Update existing card's editable properties
        const existingCard = mergedCollectionCards[cardKey];
        mergedCollectionCards[cardKey] = {
          ...existingCard,
          collectionCard: {
            ...existingCard.collectionCard,
            // Update only editable properties
            amount: cardData.collectionCard.amount,
            note: cardData.collectionCard.note,
            price: cardData.collectionCard.price,
          },
        };
      }
    });

    // 3. Merge groupCards
    const mergedGroupCards: Record<string, string[]> = { ...state.groupCards };

    // Add new groups or update existing ones
    Object.entries(data.groupCards || {}).forEach(([groupId, cardKeys]) => {
      if (!mergedGroupCards[groupId]) {
        // Add new group if it doesn't exist
        mergedGroupCards[groupId] = [...cardKeys];
      } else {
        // If group exists, add missing card keys
        const existingCardKeys = new Set(mergedGroupCards[groupId]);
        cardKeys.forEach(cardKey => {
          if (!existingCardKeys.has(cardKey)) {
            existingCardKeys.add(cardKey);
          }
        });
        mergedGroupCards[groupId] = [...existingCardKeys];
      }
    });

    // 4. Update cardCount for each group based on groupCards
    Object.keys(mergedGroupInfo).forEach(groupId => {
      mergedGroupInfo[groupId].cardCount = mergedGroupCards[groupId]?.length || 0;
    });

    return {
      ...state,
      groupInfo: mergedGroupInfo,
      collectionCards: mergedCollectionCards,
      groupCards: mergedGroupCards,
    };
  });

const setCollectionCards = (cards: Record<string, CollectionCardExtended>) =>
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
      [key]: {
        ...state.collectionCards[key],
        collectionCard: card,
      },
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

const forceRefreshCollectionGroupStore = () =>
  store.setState(state => ({
    ...state,
    forceRefreshId: Date.now().toString(),
  }));

// Hook to access the store state
export function useCollectionGroupStoreLoading() {
  return useStore(store, state => state.loading);
}

// Hook to access the store state
export function useCollectionGroupStoreLoadedCollectionId() {
  return useStore(store, state => state.loadedCollectionId);
}

export function useCollectionGroupStore() {
  const groupInfo = useStore(store, state => state.groupInfo);
  const collectionCards = useStore(store, state => state.collectionCards);
  const groupCards = useStore(store, state => state.groupCards);

  return {
    groupInfo,
    collectionCards,
    groupCards,
  };
}

// Hook to access a specific group's card keys
export function useForceRefreshCollectionGroupStore() {
  return useStore(store, state => state.forceRefreshId);
}

// Hook to access a specific group's card keys
export function useGroupCards(groupId: string) {
  return useStore(store, state => state.groupCards[groupId] || []);
}

export function useCollectionCards() {
  return useStore(store, state => state.collectionCards);
}

// Hooks to access a specific collection card
export function useCCDetail(cardKey: string): CollectionCard | undefined {
  return useStore(store, state => state.collectionCards[cardKey]?.collectionCard);
}
export function useCCVariant(cardKey: string): CardVariant | undefined {
  return useStore(store, state => state.collectionCards[cardKey]?.variant);
}
export function useCCCard(cardKey: string): CardDataWithVariants<CardListVariants> | undefined {
  return useStore(store, state => state.collectionCards[cardKey]?.card);
}
export function useCollectionGroupInfo(groupId: string) {
  return useStore(store, state => state.groupInfo[groupId]);
}
export function useCollectionGroupInfoSubgroups(groupId: string) {
  return useStore(store, state => state.groupInfo[groupId]?.subGroupIds);
}

// Hook to access the store actions
export function useCollectionGroupStoreActions() {
  return {
    setCollectionStoreData,
    mergeToCollectionStoreData,
    setLoading,
    setLoadedCollectionId,
    setCollectionCards,
    updateCollectionCard,
    setGroupCards,
    setGroupInfo,
    clearStore,
    forceRefreshCollectionGroupStore,
  };
}
