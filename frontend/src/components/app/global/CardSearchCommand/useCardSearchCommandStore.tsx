import { Store, useStore } from '@tanstack/react-store';
import { useCardList } from '@/api/lists/useCardList.ts';
import { useMemo } from 'react';
import { selectDefaultVariant } from '@/lib/cards/selectDefaultVariant.ts';

interface CardSearchCommandStore {
  open: boolean;
  search: string;
}

const defaultState: CardSearchCommandStore = {
  open: false,
  search: '',
};

const store = new Store<CardSearchCommandStore>(defaultState);

const setOpen = (open: boolean) => store.setState(state => ({ ...state, open }));
const setSearch = (search: string) => store.setState(state => ({ ...state, search }));

const resetState = () => store.setState(() => ({ ...defaultState }));

export function useCardSearchCommandStore() {
  const open = useStore(store, state => state.open);
  const search = useStore(store, state => state.search);

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

export function useCardSearchCommandStoreActions() {
  return {
    setOpen,
    setSearch,

    resetState,
  };
}
