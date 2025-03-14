import { Store, useStore } from '@tanstack/react-store';

interface DeckFilterStore {}

const defaultState: DeckFilterStore = {};

const store = new Store<DeckFilterStore>(defaultState);

export function useDeckFilterStore() {
  return {};
}

export function useDeckFilterStoreActions() {
  return {};
}
