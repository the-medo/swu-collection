import { Store, useStore } from '@tanstack/react-store';
import { useUser } from '@/hooks/useUser.ts';
import { useRole } from '@/hooks/useRole.ts';
import { useGetDeck } from '@/api/decks/useGetDeck.ts';
import { useEffect } from 'react';

interface DeckInfoStore {
  deckInfo: Record<
    string,
    | {
        format: number;
        owned: boolean;
        editable: boolean;
        cardPoolId?: string | null;
      }
    | undefined
  >;
}

const defaultState: DeckInfoStore = {
  deckInfo: {},
};

const store = new Store<DeckInfoStore>(defaultState);

const setDeckInfo = (deckId: string, format: number, owned: boolean, cardPoolId?: string | null) =>
  store.setState(state => ({
    ...state,
    deckInfo: {
      ...state.deckInfo,
      [deckId]: { format, owned, editable: owned && !cardPoolId, cardPoolId },
    },
  }));

export function useDeckInfo(deckId: string) {
  return (
    useStore(store, state => state.deckInfo[deckId]) ?? {
      format: 1,
      owned: false,
      editable: false,
      cardPoolId: undefined,
    }
  );
}

export function useDeckInfoStoreActions() {
  return {
    setDeckInfo: setDeckInfo,
  };
}

export const useSetDeckInfo = (deckId: string, adminEdit: boolean = false) => {
  const user = useUser();
  const hasRole = useRole();
  const isAdmin = hasRole('admin');

  const { data, isFetching, error } = useGetDeck(deckId);
  const { setDeckInfo } = useDeckInfoStoreActions();

  const deckUserId = data?.user?.id ?? '';
  const format = data?.deck.format ?? 1;
  const owned = (user?.id === deckUserId || (isAdmin && adminEdit)) ?? false;

  useEffect(() => {
    setDeckInfo(deckId, format, owned, data?.deck.cardPoolId);
  }, [deckId, format, owned]);

  return { data, loading: isFetching, error, owned, deckUserId };
};
