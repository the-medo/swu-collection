import { Store, useStore } from '@tanstack/react-store';
import { CollectionType } from '../../../../../types/enums.ts';
import { useEffect } from 'react';

export enum ComparerMode {
  INTERSECTION = 'intersection',
  DIFFERENCE = 'difference',
  UNION = 'union',
}

export enum DiffDisplayMode {
  COUNT_AND_DIFF = 'count_and_diff',
  COUNT_ONLY = 'count_only',
  DIFF_ONLY = 'diff_only',
}

// Local storage key for comparer state
const COMPARER_STORAGE_KEY = 'swu-comparer-state';
// URL parameter key for comparer state
const COMPARER_URL_PARAM = 'state';

// Utility functions for URL encoding/decoding
export const encodeStateToUrl = (state: ComparerStore): string => {
  try {
    // Create a minimal version of the state with only necessary data
    const minimalState = {
      m: state.mode,
      i: state.mainId,
      e: state.entries.map(entry => ({
        i: entry.id,
        t: entry.dataType,
        c: entry.collectionType,
        a: entry.additionalData ? { t: entry.additionalData.title } : undefined,
      })),
    };

    // Convert to JSON and encode as base64
    const jsonString = JSON.stringify(minimalState);
    return btoa(encodeURIComponent(jsonString));
  } catch (error) {
    console.error('Failed to encode comparer state to URL:', error);
    return '';
  }
};

export const decodeStateFromUrl = (encodedState: string): ComparerStore | null => {
  try {
    // Decode base64 and parse JSON
    const jsonString = decodeURIComponent(atob(encodedState));
    const minimalState = JSON.parse(jsonString);

    // Validate the minimal state structure
    if (!minimalState || !Array.isArray(minimalState.e)) {
      console.error('Invalid comparer state format in URL');
      return null;
    }

    // Convert back to full state
    return {
      mode: minimalState.m,
      mainId: minimalState.i,
      entries: minimalState.e.map((e: any) => ({
        id: e.i,
        dataType: e.t,
        collectionType: e.c,
        additionalData: e.a ? { title: e.a.t } : undefined,
      })),
    };
  } catch (error) {
    console.error('Failed to decode comparer state from URL:', error);
    return null;
  }
};

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

interface ComparerSettings {
  diffDisplayMode: DiffDisplayMode;
}

interface ComparerStore {
  mode: ComparerMode;
  mainId?: string;
  entries: ComparerEntry[];
  settings: ComparerSettings;
}

const defaultSettings: ComparerSettings = {
  diffDisplayMode: DiffDisplayMode.COUNT_AND_DIFF,
};

const defaultState: ComparerStore = {
  mode: ComparerMode.INTERSECTION,
  entries: [],
  settings: defaultSettings,
};

// Save state to localStorage
const saveToLocalStorage = (state: ComparerStore) => {
  try {
    localStorage.setItem(COMPARER_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save comparer state to localStorage:', error);
  }
};

// Load state from localStorage
const loadFromLocalStorage = (): ComparerStore | null => {
  try {
    const savedState = localStorage.getItem(COMPARER_STORAGE_KEY);
    if (savedState) {
      return JSON.parse(savedState);
    }
  } catch (error) {
    console.error('Failed to load comparer state from localStorage:', error);
  }
  return null;
};

// Initialize store with saved state or default state
const initialState = { ...defaultState, ...loadFromLocalStorage() };
const store = new Store<ComparerStore>(initialState);

const setMode = (mode: ComparerMode) =>
  store.setState(state => {
    const newState = { ...state, mode };
    saveToLocalStorage(newState);
    return newState;
  });

const setMainId = (mainId: string | undefined) =>
  store.setState(state => {
    if (mainId && !state.entries.some(entry => entry.id === mainId)) {
      return state;
    }
    const newState = { ...state, mainId };
    saveToLocalStorage(newState);
    return newState;
  });

const addComparerEntry = (entry: ComparerEntry) =>
  store.setState(state => {
    if (state.entries.some(e => e.id === entry.id)) {
      return state; // Don't add duplicates
    }

    const newEntries = [...state.entries, entry];
    const newMainId = state.entries.length === 0 && !state.mainId ? entry.id : state.mainId;

    const newState = {
      ...state,
      entries: newEntries,
      mainId: newMainId,
    };
    saveToLocalStorage(newState);
    return newState;
  });

const removeComparerEntry = (id: string) =>
  store.setState(state => {
    const newEntries = state.entries.filter(entry => entry.id !== id);
    const newMainId =
      id === state.mainId ? (newEntries.length > 0 ? newEntries[0].id : undefined) : state.mainId;

    const newState = {
      ...state,
      entries: newEntries,
      mainId: newMainId,
    };
    saveToLocalStorage(newState);
    return newState;
  });

const clearComparerEntries = () =>
  store.setState(state => {
    const newState = {
      ...state,
      entries: [],
      mainId: undefined,
    };
    saveToLocalStorage(newState);
    return newState;
  });

const updateSettings = (settings: Partial<ComparerSettings>) =>
  store.setState(state => {
    const newSettings = {
      ...state.settings,
      ...settings,
    };
    const newState = {
      ...state,
      settings: newSettings,
    };
    saveToLocalStorage(newState);
    return newState;
  });

export function useComparerStore() {
  const mode = useStore(store, state => state.mode);
  const mainId = useStore(store, state => state.mainId);
  const entries = useStore(store, state => state.entries);
  const settings = useStore(store, state => state.settings);

  return {
    mode,
    mainId,
    entries,
    settings,
  };
}

export function useComparerStoreActions() {
  return {
    setMode,
    setMainId,
    addComparerEntry,
    removeComparerEntry,
    clearComparerEntries,
    updateSettings,
  };
}
