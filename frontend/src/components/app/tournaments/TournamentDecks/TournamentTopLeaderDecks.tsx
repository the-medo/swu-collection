import { useNavigate, useSearch } from '@tanstack/react-router';
import { Trophy } from 'lucide-react';
import { useCardList } from '@/api/lists/useCardList.ts';
import CardImage from '@/components/app/global/CardImage.tsx';
import { useIsMobile } from '@/hooks/use-mobile.tsx';
import { cn } from '@/lib/utils.ts';
import { selectDefaultVariant } from '../../../../../../server/lib/cards/selectDefaultVariant.ts';
import type { TopLeaderDeck } from './topLeaderDecks.ts';

interface TournamentTopLeaderDecksProps {
  decks: TopLeaderDeck[];
}

const TournamentTopLeaderDecks: React.FC<TournamentTopLeaderDecksProps> = ({ decks }) => {
  const { data: cardList } = useCardList();
  const { maDeckId, deckLeaders } = useSearch({ strict: false });
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  if (decks.length === 0) return null;

  const openDeck = (deckId: string, leaderCardId: string) => {
    void navigate({
      to: '.',
      search: previous => ({
        ...previous,
        maDeckId: deckId,
        maDeckKey: undefined,
        maDeckKeyType: undefined,
        deckLeaders: [leaderCardId],
        deckBase: undefined,
        deckAspects: undefined,
        deckFormat: undefined,
      }),
      hash: isMobile ? 'tournament-deck-detail' : undefined,
    });
  };

  return (
    <section aria-label="Best placement by leader" className="min-w-0 rounded-md border p-2">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
        <Trophy className="size-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        Best placement by leader
      </div>
      <div className="flex gap-2 overflow-x-auto p-1">
        {decks.map(({ leaderCardId, deckId, placement, playerName }) => {
          const card = cardList?.cards[leaderCardId];
          const variantId = card ? selectDefaultVariant(card) : undefined;
          const set = variantId ? card?.variants[variantId]?.set.toUpperCase() : undefined;
          const leaderName = card?.title ?? leaderCardId;
          const label = `${leaderName}${set ? ` (${set})` : ''}`;

          const selected =
            maDeckId === deckId && (!deckLeaders?.length || deckLeaders.includes(leaderCardId));

          return (
            <button
              key={leaderCardId}
              type="button"
              onClick={() => openDeck(deckId, leaderCardId)}
              aria-label={`Open #${placement} ${label} deck${playerName ? ` by ${playerName}` : ''}`}
              aria-pressed={selected}
              title={`${label} · #${placement}${playerName ? ` · ${playerName}` : ''}`}
              className={cn(
                'relative shrink-0 rounded-lg border-2 border-transparent text-left transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                selected && 'border-primary',
              )}
            >
              <CardImage
                card={card}
                cardVariantId={variantId}
                size="w100"
                loading="lazy"
                forceHorizontal
                backSideButton={false}
              />
              <span className="absolute bottom-1 left-1 rounded bg-background/95 px-1.5 py-0.5 text-xs font-bold shadow-sm">
                #{placement}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default TournamentTopLeaderDecks;
