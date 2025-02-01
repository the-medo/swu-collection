import { Store, useStore } from '@tanstack/react-store';
import { useCardList } from '@/api/useCardList.ts';
import { useMemo } from 'react';
import { variantSorter } from '@/lib/cards/variantSorter.ts';
import { selectDefaultVariant } from '@/lib/cards/selectDefaultVariant.ts';
import { CardCondition, CardLanguage } from '../../../../../../../types/enums.ts';

interface CollectionInputNameStore {
  open: boolean;
  search: string;
  selectedCardId: string | undefined;
  selectedVariantId: string | undefined;
  foil: boolean;
  amount: number;
  note: string;

  language: CardLanguage;
  condition: CardCondition;

  defaultVariantName: string;
  defaultNote: string;
  defaultFoil: boolean;
  defaultAmount: number | undefined;
}

const defaultState: CollectionInputNameStore = {
  open: false,
  search: '',
  selectedCardId: undefined,
  selectedVariantId: undefined,
  foil: false,
  amount: 1,
  note: '',

  language: CardLanguage.EN,
  condition: CardCondition.NM,

  defaultVariantName: 'empty',
  defaultNote: '',
  defaultFoil: false,
  defaultAmount: undefined,
};

const store = new Store<CollectionInputNameStore>(defaultState);

const setOpen = (open: boolean) => store.setState(state => ({ ...state, open }));
const setSearch = (search: string) => store.setState(state => ({ ...state, search }));
const setSelectedCardId = (selectedCardId: string | undefined) =>
  store.setState(state => ({ ...state, selectedCardId }));
const setSelectedVariantId = (selectedVariantId: string | undefined) =>
  store.setState(state => ({ ...state, selectedVariantId }));
const setDefaultVariantName = (defaultVariantName: string) =>
  store.setState(state => ({ ...state, defaultVariantName }));
const setDefaultFoil = (defaultFoil: boolean) =>
  store.setState(state => ({ ...state, defaultFoil }));
const setDefaultAmount = (defaultAmount: number | undefined) =>
  store.setState(state => ({ ...state, defaultAmount }));
const setFoil = (foil: boolean) => store.setState(state => ({ ...state, foil }));
const setAmount = (amount: number) => store.setState(state => ({ ...state, amount }));

const resetState = () => store.setState(() => ({ ...defaultState }));
const resetStateWithDefaults = () =>
  store.setState(state => ({
    ...defaultState,
    defaultFoil: state.defaultFoil,
    defaultAmount: state.defaultAmount,
    defaultVariantName: state.defaultVariantName,
    foil: state.defaultFoil ?? false,
    amount: state.defaultAmount ?? 1,
  }));

export function useCollectionInputNameStore() {
  const open = useStore(store, state => state.open);
  const search = useStore(store, state => state.search);
  const selectedCardId = useStore(store, state => state.selectedCardId);
  const selectedVariantId = useStore(store, state => state.selectedVariantId);
  const defaultVariantName = useStore(store, state => state.defaultVariantName);
  const defaultFoil = useStore(store, state => state.defaultFoil);
  const defaultAmount = useStore(store, state => state.defaultAmount);
  const amount = useStore(store, state => state.amount);
  const foil = useStore(store, state => state.foil);

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

  const variantOptions = useMemo(() => {
    if (!cardList) return [];
    if (!selectedCardId) return [];
    const card = cardList.cards[selectedCardId];
    if (!card) return [];
    const variantIds = Object.keys(card.variants);

    return variantIds.map(vid => card.variants[vid]!).sort(variantSorter);
  }, [cardList, selectedCardId]);

  const card = useMemo(() => {
    const emptyResult = {
      card: undefined,
      variant: undefined,
      isSelectedVariant: false,
    };

    if (!cardList) return emptyResult;
    if (!selectedCardId) return emptyResult;
    const card = cardList.cards[selectedCardId];
    if (!card) return emptyResult;

    let variant = selectedVariantId ? card.variants[selectedVariantId] : undefined;
    const isSelectedVariant = !!variant;
    if (!isSelectedVariant) {
      const defaultVariant = selectDefaultVariant(card);
      if (defaultVariant) variant = card.variants[defaultVariant];
    }

    return {
      card,
      variant,
      isSelectedVariant,
    };
  }, [selectedCardId, selectedVariantId, cardList]);

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
      card,
      defaultVariantName,
      defaultFoil,
      defaultAmount,
      amount,
      foil,
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
      card,
      defaultVariantName,
      defaultFoil,
      defaultAmount,
      amount,
      foil,
    ],
  );
}

export function useCollectionInputNameStoreActions() {
  return {
    setOpen,
    setSearch,
    setSelectedCardId,
    setSelectedVariantId,
    setFoil,
    setAmount,
    setDefaultVariantName,
    setDefaultFoil,
    setDefaultAmount,
    resetState,
    resetStateWithDefaults,
  };
}
