import { Store, useStore } from '@tanstack/react-store';
import { useCardList } from '@/api/lists/useCardList.ts';
import { useCallback, useMemo } from 'react';
import { CardCondition, CardLanguage, SwuSet } from '../../../../../../../types/enums.ts';

interface CollectionInputNumberStore {
  search: string;
  set: SwuSet;
  selectedCardId: string | undefined;
  selectedVariantId: string | undefined;
  foil: boolean;
  amount: number | undefined;
  note: string;
  language: CardLanguage;
  condition: CardCondition;

  defaultNote: string;
  defaultFoil: boolean;
  defaultAmount: number | undefined;
  defaultLanguage: CardLanguage;
  defaultCondition: CardCondition;
}

const defaultState: CollectionInputNumberStore = {
  search: '',
  set: SwuSet.TWI,
  selectedCardId: undefined,
  selectedVariantId: undefined,
  foil: false,
  amount: 1,
  note: '',
  language: CardLanguage.EN,
  condition: CardCondition.NM,

  defaultNote: '',
  defaultFoil: false,
  defaultAmount: undefined,
  defaultLanguage: CardLanguage.EN,
  defaultCondition: CardCondition.NM,
};

const store = new Store<CollectionInputNumberStore>(defaultState);

const setSearch = (search: string) => store.setState(state => ({ ...state, search }));
const setSet = (set: SwuSet) => store.setState(state => ({ ...state, set }));
const setSelectedCardId = (selectedCardId: string | undefined) =>
  store.setState(state => ({ ...state, selectedCardId }));
const setSelectedVariantId = (selectedVariantId: string | undefined) =>
  store.setState(state => ({ ...state, selectedVariantId }));
const setFoil = (foil: boolean) => store.setState(state => ({ ...state, foil }));
const setAmount = (amount: number | undefined) => store.setState(state => ({ ...state, amount }));
const setNote = (note: string) => store.setState(state => ({ ...state, note }));
const setLanguage = (language: CardLanguage) => store.setState(state => ({ ...state, language }));
const setCondition = (condition: CardCondition) =>
  store.setState(state => ({ ...state, condition }));

const setDefaultNote = (defaultNote: string) =>
  store.setState(state => ({ ...state, defaultNote }));
const setDefaultFoil = (defaultFoil: boolean) =>
  store.setState(state => ({ ...state, defaultFoil }));
const setDefaultAmount = (defaultAmount: number | undefined) =>
  store.setState(state => ({ ...state, defaultAmount }));
const setDefaultLanguage = (defaultLanguage: CardLanguage) =>
  store.setState(state => ({ ...state, defaultLanguage }));
const setDefaultCondition = (defaultCondition: CardCondition) =>
  store.setState(state => ({ ...state, defaultCondition }));

const resetState = () => store.setState(() => ({ ...defaultState }));
const resetStateWithDefaults = () =>
  store.setState(state => ({
    ...defaultState,
    set: state.set,
    defaultFoil: state.defaultFoil,
    defaultAmount: state.defaultAmount,
    defaultNote: state.defaultNote,
    defaultLanguage: state.defaultLanguage,
    defaultCondition: state.defaultCondition,
    language: state.defaultLanguage,
    condition: state.defaultCondition,
    foil: state.defaultFoil ?? false,
    amount: state.defaultAmount ?? 1,
    note: state.defaultNote ?? '',
  }));

export function useCollectionInputNumberStore() {
  const search = useStore(store, state => state.search);
  const set = useStore(store, state => state.set);
  const selectedCardId = useStore(store, state => state.selectedCardId);
  const selectedVariantId = useStore(store, state => state.selectedVariantId);
  const amount = useStore(store, state => state.amount);
  const foil = useStore(store, state => state.foil);
  const note = useStore(store, state => state.note);
  const language = useStore(store, state => state.language);
  const condition = useStore(store, state => state.condition);

  const defaultFoil = useStore(store, state => state.defaultFoil);
  const defaultAmount = useStore(store, state => state.defaultAmount);
  const defaultNote = useStore(store, state => state.defaultNote);
  const defaultLanguage = useStore(store, state => state.defaultLanguage);
  const defaultCondition = useStore(store, state => state.defaultCondition);

  let { data: cardList, isFetching } = useCardList();

  const setCardByNumber = useCallback(
    (n: number) => {
      const card = cardList?.cardsByCardNo[set]?.[n];
      if (card) {
        setSelectedCardId(card.cardId);
        setSelectedVariantId(card.variant.variantId);
      } else {
        setSelectedCardId(undefined);
        setSelectedVariantId(undefined);
      }
    },
    [set, cardList],
  );

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

    return {
      card,
      variant,
    };
  }, [selectedCardId, selectedVariantId, cardList]);

  return {
    search,
    set,
    selectedCardId,
    selectedVariantId,
    isFetching,
    cardList,
    card,
    amount,
    foil,
    note,
    language,
    condition,

    defaultFoil,
    defaultAmount,
    defaultNote,
    defaultLanguage,
    defaultCondition,

    setCardByNumber,
  };
}

export function useCollectionInputNumberStoreActions() {
  return {
    setSearch,
    setSet,
    setSelectedCardId,
    setSelectedVariantId,
    setFoil,
    setAmount,
    setNote,
    setLanguage,
    setCondition,

    setDefaultFoil,
    setDefaultAmount,
    setDefaultNote,
    setDefaultLanguage,
    setDefaultCondition,

    resetState,
    resetStateWithDefaults,
  };
}
