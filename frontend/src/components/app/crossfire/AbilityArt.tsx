import { useContext } from 'react';
import { GameCatalog } from './gameCatalog.ts';
import { FaceImage } from './GameCard.tsx';
import type { VisibleReference } from '../../../../../play/view/types.ts';

export function AbilityArt({ source }: { source: VisibleReference }) {
  const catalog = useContext(GameCatalog);
  const card = catalog?.[source.cardId];
  // Leader art always comes from the unit face. Event art is below its text;
  // units, upgrades and the leader's unit face have artwork above the text.
  return (
    <span
      className="cf-ability-art"
      data-art-region={card?.type === 'Event' ? 'event' : 'unit'}
      aria-hidden="true"
    >
      <FaceImage
        face={{
          cardId: source.cardId,
          name: source.name,
          side: card?.type === 'Leader' ? 'back' : 'front',
        }}
      />
    </span>
  );
}
