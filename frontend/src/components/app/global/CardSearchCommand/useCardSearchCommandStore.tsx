import { Store, useStore } from '@tanstack/react-store';
import { useCardList } from '@/api/lists/useCardList.ts';
import { useMemo } from 'react';
import { searchForCommandOptions } from '@/components/app/cards/AdvancedCardSearch/searchService.ts';

type CardSearchCommandStore = Record<
  string,
  | {
      open?: boolean;
      search?: string;
    }
  | undefined
>;

const defaultState: CardSearchCommandStore = {};

const store = new Store<CardSearchCommandStore>(defaultState);

const setOpen = (id: string, open: boolean) =>
  store.setState(state => ({ ...state, [id]: { ...state[id], open } }));
const setSearch = (id: string, search: string) =>
  store.setState(state => ({ ...state, [id]: { ...state[id], search } }));

const resetState = () => store.setState(() => ({ ...defaultState }));

export function useCardSearchCommandStore(id: string) {
  const open = useStore(store, state => state[id]?.open ?? false);
  const search = useStore(store, state => state[id]?.search ?? '');

  let { data: cardList, isFetching } = useCardList();

  const options = useMemo(() => searchForCommandOptions(cardList, search), [cardList, search]);

  return {
    open,
    search,
    options,
    isFetching,
    cardList,
  };
}

export function useCardSearchCommandStoreActions(id: string) {
  return {
    setOpen: (open: boolean) => setOpen(id, open),
    setSearch: (search: string) => setSearch(id, search),

    resetState,
  };
}
