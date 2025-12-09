import { useGetDeck } from '@/api/decks/useGetDeck.ts';
import { useEffect } from 'react';
import { useCardPoolDeckDetailStoreActions } from '@/components/app/limited/CardPoolDeckDetail/useCardPoolDeckDetailStore.ts';

export function useCPStoreInitializator(deckId: string | undefined) {
  const { data: deckData, isFetching: isDeckFetching } = useGetDeck(deckId);
  const { setFilterAspects, setLeadersAndBasesExpanded, setContentBoxesBy, setInitialized } =
    useCardPoolDeckDetailStoreActions();

  useEffect(() => {
    if (!isDeckFetching && deckData) {
      //if deck has a leader and base card, show only those aspects + show "smaller" view for leaders and bases
      if (deckData?.deck?.leaderCardId1 && deckData?.deck?.baseCardId) {
        setFilterAspects('showOnlyLeaderAndBaseAspects');
        setLeadersAndBasesExpanded(false);
        setContentBoxesBy('X');
      }

      setInitialized(true);
    }
  }, [isDeckFetching, deckData]);
}
