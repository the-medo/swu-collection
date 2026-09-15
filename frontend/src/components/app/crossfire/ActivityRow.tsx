import type { ReactNode } from 'react';
import { useCardList } from '@/api/lists/useCardList.ts';
import type { CrossfireGameArtwork } from '../../../../../shared/types/crossfire-activity.ts';
import { DeckArtwork } from './DeckArtwork.tsx';
import { deckCardName } from './presentation.ts';

/** All home activity uses the leaders actually admitted to that game. */
export function ActivityRow({
  leaders,
  children,
  className = '',
}: CrossfireGameArtwork & {
  children: ReactNode;
  className?: string;
}) {
  const { data: catalog } = useCardList();
  const description = leaders
    ? leaders.map(id => deckCardName(catalog?.cards, id) || 'Unknown leader').join(' vs. ')
    : 'Game artwork unavailable';
  return (
    <article className={`cf-game-row ${className}`}>
      <div className="cf-game-artwork" role="img" aria-label={description} title={description}>
        <DeckArtwork cardId={leaders?.[0]} catalog={catalog?.cards} />
        <span className="cf-game-versus" aria-hidden="true">
          vs
        </span>
        <DeckArtwork cardId={leaders?.[1]} catalog={catalog?.cards} />
      </div>
      <div className="cf-game-row-body">{children}</div>
    </article>
  );
}
