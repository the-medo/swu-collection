import { Store, useStore } from '@tanstack/react-store';
import { useCardList } from '@/api/useCardList.ts';
import { useMemo } from 'react';
import { variantSorter } from '@/lib/variantSorter.ts';

interface CollectionInputNameStore {
  open: boolean;
  search: string;
  selectedCardId: string | undefined;
  selectedVariantId: string | undefined;
}

const defaultState: CollectionInputNameStore = {
  open: false,
  search: '',
  selectedCardId: undefined,
  selectedVariantId: undefined,
};

const store = new Store<CollectionInputNameStore>(defaultState);

const setOpen = (open: boolean) => store.setState(state => ({ ...state, open }));
const setSearch = (search: string) => store.setState(state => ({ ...state, search }));
const setSelectedCardId = (selectedCardId: string | undefined) =>
  store.setState(state => ({ ...state, selectedCardId }));
const setSelectedVariantId = (selectedVariantId: string | undefined) =>
  store.setState(state => ({ ...state, selectedVariantId }));
const resetState = () => store.setState(() => ({ ...defaultState }));

export function useCollectionInputNameStore() {
  const open = useStore(store, state => state.open);
  const search = useStore(store, state => state.search);
  const selectedCardId = useStore(store, state => state.selectedCardId);
  const selectedVariantId = useStore(store, state => state.selectedVariantId);

  let { data: cardList, isFetching } = useCardList();

  const options = useMemo(() => {
    if (!cardList) return [];
    let s = search?.toLowerCase() ?? '';
    const filteredOptions: { cardId: string; variantIds: string[]; defaultVariant: string }[] = [];
    cardList.cardIds.find(i => {
      const card = cardList.cards[i];
      if (card?.name.toLowerCase().includes(s)) {
        const variantIds = Object.keys(card.variants);

        if (variantIds.length === 0) return false;

        let defaultVariant = variantIds.find(id => card.variants[id]?.variantName === 'Standard');
        if (!defaultVariant) {
          defaultVariant =
            variantIds.find(id => card.variants[id]?.baseSet === true) ?? variantIds[0];
        }

        filteredOptions.push({ cardId: i, variantIds, defaultVariant });
        if (filteredOptions.length >= 7) return true;
      }
      return false;
    });

    return filteredOptions;
  }, [cardList, search]);

  const variantOptions = useMemo(() => {
    if (!cardList) return [];
    if (!selectedCardId) return [];
    const card = cardList.cards[selectedCardId];
    if (!card) return [];
    const variantIds = Object.keys(card.variants);

    return variantIds.map(vid => card.variants[vid]!).sort(variantSorter);
  }, [cardList, selectedCardId]);

  return useMemo(
    () => ({
      open,
      search,
      selectedCardId,
      selectedVariantId,
      options,
      variantOptions,
      isFetching,
      cardList,
      setOpen,
      setSearch,
      setSelectedCardId,
      setSelectedVariantId,
      resetState,
    }),
    [
      open,
      search,
      selectedCardId,
      selectedVariantId,
      options,
      variantOptions,
      isFetching,
      cardList,
    ],
  );
}
