import { useState } from 'react';
import { Layers } from 'lucide-react';
import { getCardImageUrl } from '@/components/app/global/cardImageLib.ts';
import { selectDefaultVariant } from '../../../../../server/lib/cards/selectDefaultVariant.ts';
import type { CardList } from '../../../../../lib/swu-resources/types.ts';

/** Leader-unit artwork, cropped locally; the shared card catalog remains the image authority. */
export function DeckArtwork({
  cardId,
  catalog,
  className = '',
}: {
  cardId?: string | null;
  catalog?: CardList;
  className?: string;
}) {
  const card = cardId ? catalog?.[cardId] : undefined;
  const variant = card && selectDefaultVariant(card);
  const images = card && variant ? card.variants[variant]?.image : undefined;
  const src = getCardImageUrl(images?.back);
  const [failed, setFailed] = useState<string>();
  return (
    <span className={`cf-deck-art ${className}`} aria-hidden="true">
      {src && failed !== src ? (
        <img src={src} alt="" loading="lazy" draggable={false} onError={() => setFailed(src)} />
      ) : (
        <Layers className="cf-deck-art-placeholder" />
      )}
    </span>
  );
}
