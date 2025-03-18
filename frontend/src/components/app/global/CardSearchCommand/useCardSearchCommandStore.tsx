import { Store, useStore } from '@tanstack/react-store';
import { useCardList } from '@/api/lists/useCardList.ts';
import { useMemo } from 'react';
import { selectDefaultVariant } from '@/lib/cards/selectDefaultVariant.ts';

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

  const options = useMemo(() => {
    if (!cardList) return [];
    let s = search?.toLowerCase() ?? '';
    const filteredOptions: { cardId: string; variantIds: string[]; defaultVariant: string }[] = [];
    cardList.cardIds?.find(i => {
      const card = cardList.cards[i];
      if (card?.name.toLowerCase().includes(s)) {
        const variantIds = Object.keys(card.variants);
        if (variantIds.length === 0) return false;

        filteredOptions.push({
          cardId: i,
          variantIds,
          defaultVariant: selectDefaultVariant(card) ?? '',
        });
        if (filteredOptions.length >= 7) return true;
      }
      return false;
    });

    return filteredOptions;
  }, [cardList, search]);

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
