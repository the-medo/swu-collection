import React from 'react';
import { useDeckMissingCardsStore } from '@/components/app/decks/DeckContents/DeckCollection/useDeckMissingCardsStore.ts';
import { cn } from '@/lib/utils.ts';

interface OwnedQuantityLike {
  deckCollection?: number;
  nonDeckCollection?: number;
  wantlist?: number;
  cardlist?: number;
}

interface CardOwnershipMiniStatsProps {
  owned?: OwnedQuantityLike;
}

const Pill: React.FC<{ label: string; value?: number; enabled: boolean }> = ({
  label,
  value,
  enabled,
}) => {
  const v = value ?? 0;
  return (
    <div
      className={cn(
        `flex items-center gap-1 px-1 rounded`,
        v > 0 ? (enabled ? 'bg-emerald-200/70 dark:bg-emerald-300/30' : 'bg-muted') : '',
      )}
    >
      <span className="font-semibold">{label}</span>
      <span className={cn(v > 0 ? 'font-semibold' : '')}>{v}</span>
    </div>
  );
};

const CardOwnershipMiniStats: React.FC<CardOwnershipMiniStatsProps> = ({ owned }) => {
  const cdOn = useDeckMissingCardsStore('countCollectionsForDecks');
  const coOn = useDeckMissingCardsStore('countCollectionsNotForDecks');
  const wlOn = useDeckMissingCardsStore('countWantlists');
  const olOn = useDeckMissingCardsStore('countOtherLists');

  return (
    <div className="flex flex-1 gap-2 text-[10px] text-muted-foreground @[550px]/missing-cards-table:hidden flex-wrap">
      <Pill label="CD" value={owned?.deckCollection} enabled={cdOn} />
      <Pill label="CO" value={owned?.nonDeckCollection} enabled={coOn} />
      <Pill label="WL" value={owned?.wantlist} enabled={wlOn} />
      <Pill label="OL" value={owned?.cardlist} enabled={olOn} />
    </div>
  );
};

export default CardOwnershipMiniStats;
