import { Store, useStore } from '@tanstack/react-store';
import { useCardList } from '@/api/lists/useCardList.ts';
import { useCallback, useMemo } from 'react';
import { variants } from '@/lib/cards/variants.ts';
import { selectDefaultVariant } from '@/lib/cards/selectDefaultVariant.ts';
import { CardCondition, CardLanguage } from '../../../../../../../types/enums.ts';
import { getFoilBasedOnVariantAndSet } from '@/components/app/collections/CollectionInput/collectionInputLib.ts';
import { searchForCommandOptions } from '@/components/app/cards/AdvancedCardSearch/searchService.ts';

interface CollectionInputNameStore {
  open: boolean;
  search: string;
  selectedCardId: string | undefined;
  selectedVariantId: string | undefined;
  foil: boolean;
  amount: number | undefined;
  note: string;
  language: CardLanguage;
  condition: CardCondition;

  defaultVariantName: string;
  defaultNote: string;
  defaultFoil: boolean;
  defaultAmount: number | undefined;
  defaultLanguage: CardLanguage;
  defaultCondition: CardCondition;
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
  defaultLanguage: CardLanguage.EN,
  defaultCondition: CardCondition.NM,
};

const store = new Store<CollectionInputNameStore>(defaultState);

const setOpen = (open: boolean) => store.setState(state => ({ ...state, open }));
const setSearch = (search: string) => store.setState(state => ({ ...state, search }));
const setSelectedCardId = (selectedCardId: string | undefined) =>
  store.setState(state => ({ ...state, selectedCardId }));
const setSelectedVariantId = (selectedVariantId: string | undefined) =>
  store.setState(state => {
    return { ...state, selectedVariantId };
  });
const setFoil = (foil: boolean) => store.setState(state => ({ ...state, foil }));
const setAmount = (amount: number | undefined) => store.setState(state => ({ ...state, amount }));
const setNote = (note: string) => store.setState(state => ({ ...state, note }));
const setLanguage = (language: CardLanguage) => store.setState(state => ({ ...state, language }));
const setCondition = (condition: CardCondition) =>
  store.setState(state => ({ ...state, condition }));

const setDefaultVariantName = (defaultVariantName: string) =>
  store.setState(state => ({ ...state, defaultVariantName }));
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
    defaultFoil: state.defaultFoil,
    defaultAmount: state.defaultAmount,
    defaultVariantName: state.defaultVariantName,
    defaultNote: state.defaultNote,
    defaultLanguage: state.defaultLanguage,
    defaultCondition: state.defaultCondition,
    language: state.defaultLanguage,
    condition: state.defaultCondition,
    foil: state.defaultFoil ?? false,
    amount: state.defaultAmount ?? 1,
    note: state.defaultNote ?? '',
  }));

export function useCollectionInputNameStore() {
  const open = useStore(store, state => state.open);
  const search = useStore(store, state => state.search);
  const selectedCardId = useStore(store, state => state.selectedCardId);
  const selectedVariantId = useStore(store, state => state.selectedVariantId);
  const amount = useStore(store, state => state.amount);
  const foil = useStore(store, state => state.foil);
  const note = useStore(store, state => state.note);
  const language = useStore(store, state => state.language);
  const condition = useStore(store, state => state.condition);

  const defaultVariantName = useStore(store, state => state.defaultVariantName);
  const defaultFoil = useStore(store, state => state.defaultFoil);
  const defaultAmount = useStore(store, state => state.defaultAmount);
  const defaultNote = useStore(store, state => state.defaultNote);
  const defaultLanguage = useStore(store, state => state.defaultLanguage);
  const defaultCondition = useStore(store, state => state.defaultCondition);

  let { data: cardList, isFetching } = useCardList();

  const setSelectedVariant = useCallback(
    (selectedVariantId: string | undefined) => {
      if (!selectedCardId || !selectedVariantId) {
        setSelectedVariantId(undefined);
        return;
      }
      const cardVariant = cardList?.cards[selectedCardId]?.variants[selectedVariantId];
      if (cardVariant) {
        setSelectedVariantId(selectedVariantId);
        setFoil(getFoilBasedOnVariantAndSet(cardVariant, defaultFoil));
      } else {
        setSelectedCardId(undefined);
        setSelectedVariantId(undefined);
      }
    },
    [selectedCardId, defaultFoil],
  );

  const options = useMemo(() => searchForCommandOptions(cardList, search), [cardList, search]);

  const variantOptions = useMemo(() => {
    if (!cardList) return [];
    if (!selectedCardId) return [];
    const card = cardList.cards[selectedCardId];
    if (!card) return [];
    const variantIds = Object.keys(card.variants);

    return variantIds.map(vid => card.variants[vid]!).sort(variants);
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
      const defaultVariant = selectDefaultVariant(
        card,
        defaultVariantName !== 'empty' ? defaultVariantName : 'Standard',
      );
      if (defaultVariant) {
        variant = card.variants[defaultVariant];
        if (defaultVariantName !== 'empty') {
          setSelectedVariantId(variant?.variantId);
        }
      }
    }

    return {
      card,
      variant,
      isSelectedVariant,
    };
  }, [defaultVariantName, selectedCardId, selectedVariantId, cardList]);

  return {
    open,
    search,
    selectedCardId,
    selectedVariantId,
    options,
    variantOptions,
    isFetching,
    cardList,
    card,
    amount,
    foil,
    note,
    language,
    condition,

    setSelectedVariant,

    defaultVariantName,
    defaultFoil,
    defaultAmount,
    defaultNote,
    defaultLanguage,
    defaultCondition,
  };
}

export function useCollectionInputNameStoreActions() {
  return {
    setOpen,
    setSearch,
    setSelectedCardId,
    setSelectedVariantId,
    setFoil,
    setAmount,
    setNote,
    setLanguage,
    setCondition,

    setDefaultVariantName,
    setDefaultFoil,
    setDefaultAmount,
    setDefaultNote,
    setDefaultLanguage,
    setDefaultCondition,

    resetState,
    resetStateWithDefaults,
  };
}
