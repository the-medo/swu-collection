import { Store, useStore } from '@tanstack/react-store';

interface CollectionFilterStore {
  search: string;
}

const defaultState: CollectionFilterStore = {
  search: '',
};

const store = new Store<CollectionFilterStore>(defaultState);

const setSearch = (search: string) => store.setState(state => ({ ...state, search }));

export function useCollectionFilterStore() {
  const search = useStore(store, state => state.search);

  return {
    search,
  };
}

export function useCollectionFilterStoreActions() {
  return {
    setSearch,
  };
}
