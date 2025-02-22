import { Store, useStore } from '@tanstack/react-store';
import {
  CardCondition,
  CardLanguage,
  SwuRarity,
  SwuSet,
} from '../../../../../../../types/enums.ts';

interface CollectionInputBulkStore {
  areYouSure: boolean;
  amount: number | undefined;
  note: string;
  language: CardLanguage;
  condition: CardCondition;
  sets: SwuSet[];
  rarities: SwuRarity[];
  variants: string[];
}

const defaultState: CollectionInputBulkStore = {
  areYouSure: false,
  amount: 1,
  note: '',
  language: CardLanguage.EN,
  condition: CardCondition.NM,
  sets: [],
  rarities: [],
  variants: ['Standard'],
};

const store = new Store<CollectionInputBulkStore>(defaultState);

const setAreYouSure = (areYouSure: boolean) => store.setState(state => ({ ...state, areYouSure }));
const setAmount = (amount: number | undefined) => store.setState(state => ({ ...state, amount }));
const setNote = (note: string) => store.setState(state => ({ ...state, note }));
const setLanguage = (language: CardLanguage) => store.setState(state => ({ ...state, language }));
const setCondition = (condition: CardCondition) =>
  store.setState(state => ({ ...state, condition }));
const setSets = (sets: SwuSet[]) => store.setState(state => ({ ...state, sets }));
const setRarities = (rarities: SwuRarity[]) => store.setState(state => ({ ...state, rarities }));
const setVariants = (variants: string[]) => store.setState(state => ({ ...state, variants }));

const resetState = () => store.setState(() => ({ ...defaultState }));

export function useCollectionInputBulkStore() {
  const areYouSure = useStore(store, state => state.areYouSure);
  const amount = useStore(store, state => state.amount);
  const note = useStore(store, state => state.note);
  const language = useStore(store, state => state.language);
  const condition = useStore(store, state => state.condition);
  const sets = useStore(store, state => state.sets);
  const rarities = useStore(store, state => state.rarities);
  const variants = useStore(store, state => state.variants);

  return {
    areYouSure,
    amount,
    note,
    language,
    condition,
    sets,
    rarities,
    variants,
  };
}

export function useCollectionInputBulkStoreActions() {
  return {
    setAreYouSure,
    setAmount,
    setNote,
    setLanguage,
    setCondition,
    setSets,
    setRarities,
    setVariants,

    resetState,
  };
}
