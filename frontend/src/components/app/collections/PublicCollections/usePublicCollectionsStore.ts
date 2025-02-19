import { Store, useStore } from '@tanstack/react-store';
import { CountryCode } from '../../../../../../server/db/lists.ts';
import { useMemo } from 'react';

interface PublicCollectionsStore {
  country: CountryCode | null;
  state: string | null;
}

const defaultState: PublicCollectionsStore = {
  country: null,
  state: null,
};

const store = new Store<PublicCollectionsStore>(defaultState);

const setCountry = (v: CountryCode | null) =>
  store.setState(state => ({ ...state, country: v, state: null }));
const setState = (v: string | null) => store.setState(state => ({ ...state, state: v }));

export function usePublicCollectionsStore() {
  const country = useStore(store, state => state.country);
  const state = useStore(store, state => state.state);

  const countryAndState = useMemo(() => ({ country, state }), [country, state]);

  return { country, state, countryAndState };
}

export function usePublicCollectionsStoreActions() {
  return { setCountry, setState };
}
