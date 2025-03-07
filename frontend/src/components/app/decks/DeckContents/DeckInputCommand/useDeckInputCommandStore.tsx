import { Store, useStore } from '@tanstack/react-store';
import { useCardList } from '@/api/lists/useCardList.ts';
import { useMemo } from 'react';
import { selectDefaultVariant } from '@/lib/cards/selectDefaultVariant.ts';

interface DeckInputCommandStore {
  open: boolean;
  search: string;
  amount: number | undefined;
  board: number;
}

const defaultState: DeckInputCommandStore = {
  open: false,
  search: '',
  amount: 1,
  board: 1,
};

const store = new Store<DeckInputCommandStore>(defaultState);

const setOpen = (open: boolean) => store.setState(state => ({ ...state, open }));
const setSearch = (search: string) => store.setState(state => ({ ...state, search }));
const setAmount = (amount: number | undefined) => store.setState(state => ({ ...state, amount }));
const setBoard = (board: number) => store.setState(state => ({ ...state, board }));

const resetState = () => store.setState(() => ({ ...defaultState }));

export function useDeckInputCommandStore() {
  const open = useStore(store, state => state.open);
  const search = useStore(store, state => state.search);
  const amount = useStore(store, state => state.amount);
  const board = useStore(store, state => state.board);

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
    amount,
    board,
  };
}

export function useDeckInputCommandStoreActions() {
  return {
    setOpen,
    setSearch,
    setAmount,
    setBoard,

    resetState,
  };
}
