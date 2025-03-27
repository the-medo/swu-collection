import { Store, useStore } from '@tanstack/react-store';
import { CollectionType } from '../../../../../types/enums.ts';

export enum ComparerMode {
  INTERSECTION = 'intersection',
  DIFFERENCE = 'difference',
  UNION = 'union',
}

export type ComparerEntryAdditionalData = {
  title?: string;
  leader1?: string;
  leader2?: string;
  base?: string;
};

export type ComparerEntry = {
  id: string;
  dataType: 'collection' | 'deck';
  collectionType?: CollectionType;
  additionalData?: ComparerEntryAdditionalData;
};

interface ComparerStore {
  mode: ComparerMode;
  mainId?: string;
  entries: ComparerEntry[];
}

const defaultState: ComparerStore = {
  mode: ComparerMode.INTERSECTION,
  entries: [],
};

const store = new Store<ComparerStore>(defaultState);

const setMode = (mode: ComparerMode) => store.setState(state => ({ ...state, mode }));
const setMainId = (mainId: string | undefined) =>
  store.setState(state => {
    if (mainId && !state.entries.some(entry => entry.id === mainId)) {
      return state;
    }
    return { ...state, mainId };
  });

const addComparerEntry = (entry: ComparerEntry) =>
  store.setState(state => {
    if (state.entries.some(e => e.id === entry.id)) {
      return state; // Don't add duplicates
    }

    const newEntries = [...state.entries, entry];
    const newMainId = state.entries.length === 0 && !state.mainId ? entry.id : state.mainId;

    return {
      ...state,
      entries: newEntries,
      mainId: newMainId,
    };
  });

const removeComparerEntry = (id: string) =>
  store.setState(state => {
    const newEntries = state.entries.filter(entry => entry.id !== id);
    const newMainId =
      id === state.mainId ? (newEntries.length > 0 ? newEntries[0].id : undefined) : state.mainId;

    return {
      ...state,
      entries: newEntries,
      mainId: newMainId,
    };
  });

const clearComparerEntries = () =>
  store.setState(state => ({
    ...state,
    entries: [],
    mainId: undefined,
  }));

export function useComparerStore() {
  const mode = useStore(store, state => state.mode);
  const mainId = useStore(store, state => state.mainId);
  const entries = useStore(store, state => state.entries);

  return {
    mode,
    mainId,
    entries,
  };
}

export function useComparerStoreActions() {
  return {
    setMode,
    setMainId,
    addComparerEntry,
    removeComparerEntry,
    clearComparerEntries,
  };
}
