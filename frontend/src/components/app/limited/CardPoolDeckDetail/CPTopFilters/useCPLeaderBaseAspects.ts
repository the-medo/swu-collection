import { useMemo } from 'react';
import { SwuAspect } from '../../../../../../../types/enums.ts';
import { useCardPoolDeckDetailStore } from '@/components/app/limited/CardPoolDeckDetail/useCardPoolDeckDetailStore.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import { useGetDeck } from '@/api/decks/useGetDeck.ts';

export function useCPLeaderBaseAspects(deckId: string | undefined) {
  const { selectedLeaderId, selectedBaseId } = useCardPoolDeckDetailStore();
  const { data: cardListData } = useCardList();
  const { data: deckData } = useGetDeck(deckId);

  const deckLeaderId = deckData?.deck?.leaderCardId1 ?? '';
  const deckBaseId = deckData?.deck?.baseCardId ?? '';

  return useMemo(() => {
    const set = new Set<SwuAspect>();
    const leaderId = selectedLeaderId === '' ? deckLeaderId : selectedLeaderId;
    const baseId = selectedBaseId === '' ? deckBaseId : selectedBaseId;

    const leader = leaderId ? cardListData?.cards?.[leaderId] : undefined;
    const base = baseId ? cardListData?.cards?.[baseId] : undefined;
    (leader?.aspects as SwuAspect[] | undefined)?.forEach(a => set.add(a));
    (base?.aspects as SwuAspect[] | undefined)?.forEach(a => set.add(a));
    return Array.from(set);
  }, [selectedLeaderId, selectedBaseId, cardListData?.cards, deckLeaderId, deckBaseId]);
}
