import { useCardList } from '@/api/lists/useCardList.ts';
import BaseAvatar from '@/components/app/global/BaseAvatar.tsx';
import DeckBackgroundDecoration from '@/components/app/global/DeckBackgroundDecoration.tsx';
import type { LiveTournamentWeekendTournamentEntry } from '../liveTournamentTypes.ts';

export function WinnerDeckDecoration({ entry }: { entry: LiveTournamentWeekendTournamentEntry }) {
  const { data: cardListData } = useCardList();
  const deck = entry.winningDeck?.deck;

  if (!deck?.leaderCardId1 || !deck.baseCardId) return null;

  const leaderCard = cardListData?.cards[deck.leaderCardId1];
  const baseCard = cardListData?.cards[deck.baseCardId];

  if (!leaderCard) return null;

  return (
    <DeckBackgroundDecoration leaderCard={leaderCard} baseCard={baseCard} position="top-right">
      <BaseAvatar cardId={deck.baseCardId} bordered={false} size="40" shape="circle" />
    </DeckBackgroundDecoration>
  );
}
