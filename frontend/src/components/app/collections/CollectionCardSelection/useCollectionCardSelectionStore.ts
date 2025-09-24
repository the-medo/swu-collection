import { Store, useStore } from '@tanstack/react-store';
import type { CollectionCard } from '../../../../../../types/CollectionCard.ts';
import {
  addCollectionToMap,
  removeCard,
  removeCollectionFromMap,
  upsertCard,
} from '@/components/app/collections/CollectionCardSelection/collectionCardSelectionLib.ts';
import { CardLanguage } from '../../../../../../types/enums.ts';

export type CollectionCardSelectionSubtype = Omit<CollectionCard, 'cardId' | 'variantId'>;

export interface CollectionCardSelection {
  cards: Record<string, Record<string, CollectionCardSelectionSubtype[]>>;
}

export interface CollectionCardSelectionStore {
  collectionData: Record<string, CollectionCardSelection | undefined>;
}

const defaultState: CollectionCardSelectionStore = (() => {
  try {
    const mapRaw = localStorage.getItem('collectionsWithCardSelection');
    const map = mapRaw ? (JSON.parse(mapRaw) as Record<string, true>) : {};
    const collectionData: Record<string, CollectionCardSelection | undefined> = {};
    for (const collectionId of Object.keys(map)) {
      try {
        const itemRaw = localStorage.getItem(`collectionCardSelection-${collectionId}`);
        if (!itemRaw) continue;
        const parsed = JSON.parse(itemRaw) as CollectionCardSelection;
        if (parsed && parsed.cards && typeof parsed.cards === 'object') {
          collectionData[collectionId] = parsed;
        }
      } catch {}
    }
    return { collectionData } as CollectionCardSelectionStore;
  } catch {
    return { collectionData: {} } as CollectionCardSelectionStore;
  }
})();

const store = new Store<CollectionCardSelectionStore>(defaultState);

// Actions
export function useCollectionCardSelectionStore(
  collectionId: string,
): CollectionCardSelection | undefined {
  return useStore(store, s => s.collectionData[collectionId]);
}

export function useCollectionSingleCardSelectionStore(
  collectionId: string,
  cardId: string,
  variantId: string,
  foil: boolean,
  condition: number,
  language: CardLanguage,
): CollectionCardSelectionSubtype[] | undefined {
  const c = useStore(store, s => s.collectionData?.[collectionId]?.cards[cardId]?.[variantId]);
  if (!c) return undefined;
  return c.find(cc => cc.foil === foil && cc.condition === condition && cc.language === language);
}

export function useCollectionCardSelectionActions(collectionId: string) {
  const LS_KEY = `collectionCardSelection-${collectionId}`;

  const setSingleCollectionCardSelection = (card: CollectionCard) => {
    store.setState(state => {
      const current = state.collectionData[collectionId] ?? { cards: {} };
      const updatedSelection = upsertCard({ cards: { ...current.cards } }, card);
      const newCollectionData = { ...state.collectionData };
      // Clean up empty selection object
      if (Object.keys(updatedSelection.cards).length === 0) {
        delete newCollectionData[collectionId];
      } else {
        newCollectionData[collectionId] = updatedSelection;
      }
      // persist to localStorage (full selection)
      try {
        const selectionToPersist = newCollectionData[collectionId];
        if (selectionToPersist && Object.keys(selectionToPersist.cards).length > 0) {
          localStorage.setItem(LS_KEY, JSON.stringify(selectionToPersist));
          addCollectionToMap(collectionId);
        } else {
          localStorage.removeItem(LS_KEY);
          removeCollectionFromMap(collectionId);
        }
      } catch {}
      return { ...state, collectionData: newCollectionData };
    });
  };

  const removeCollectionCard = (card: CollectionCard) => {
    store.setState(state => {
      const current = state.collectionData[collectionId];
      if (!current) return state;
      const updatedSelection = removeCard({ cards: { ...current.cards } }, card);
      const newCollectionData = { ...state.collectionData };
      if (Object.keys(updatedSelection.cards).length === 0) {
        delete newCollectionData[collectionId];
      } else {
        newCollectionData[collectionId] = updatedSelection;
      }
      // persist to localStorage (full selection)
      try {
        const selectionToPersist = newCollectionData[collectionId];
        if (selectionToPersist && Object.keys(selectionToPersist.cards).length > 0) {
          localStorage.setItem(LS_KEY, JSON.stringify(selectionToPersist));
          addCollectionToMap(collectionId);
        } else {
          localStorage.removeItem(LS_KEY);
          removeCollectionFromMap(collectionId);
        }
      } catch {}
      return { ...state, collectionData: newCollectionData };
    });
  };

  const clearCollectionSelection = () => {
    store.setState(state => {
      if (!state.collectionData[collectionId]) return state;
      const newCollectionData = { ...state.collectionData };
      delete newCollectionData[collectionId];
      // remove from localStorage and collections map
      try {
        localStorage.removeItem(LS_KEY);
        removeCollectionFromMap(collectionId);
      } catch {}
      return { ...state, collectionData: newCollectionData };
    });
  };

  return { setSingleCollectionCardSelection, removeCollectionCard, clearCollectionSelection };
}
