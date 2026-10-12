import { Layers3, MessagesSquare } from 'lucide-react';
import { useCardList } from '@/api/lists/useCardList.ts';
import { DeckArtwork } from '@/components/app/decks/DeckArtwork.tsx';
import { getCardImageUrl } from '@/components/app/global/cardImageLib.ts';
import SetIcon from '@/components/app/global/icons/SetIcon.tsx';
import { selectDefaultVariant } from '../../../../../server/lib/cards/selectDefaultVariant.ts';
import type { RecentDiscussionThumbnail } from '../../../../../shared/types/discussions.ts';

function CardThumbnail({ cardId }: { cardId: string }) {
  const { data } = useCardList();
  const card = data?.cards[cardId];
  const variantId = card ? selectDefaultVariant(card) : undefined;
  const src = getCardImageUrl(card?.variants[variantId ?? '']?.image.front);
  return src ? (
    <img
      src={src}
      alt=""
      loading="lazy"
      className="max-h-20 max-w-full rounded-[5px] object-contain shadow-sm max-phone:max-h-16"
    />
  ) : (
    <Layers3 size={26} strokeWidth={1.4} />
  );
}

export function DiscussionThumbnail({
  thumbnail,
}: {
  thumbnail?: RecentDiscussionThumbnail | null;
}) {
  return (
    <div
      aria-hidden="true"
      className="today-discussion-thumbnail flex h-20 w-28 shrink-0 items-center justify-center text-muted-foreground max-phone:w-22 max-phone:[&_.deck-artwork]:scale-75"
    >
      {thumbnail?.kind === 'deck' ? (
        <DeckArtwork
          leaderId={thumbnail.leaderId}
          leader2Id={thumbnail.leader2Id}
          baseId={thumbnail.baseId}
          size="compact"
        />
      ) : thumbnail?.kind === 'card' ? (
        <CardThumbnail cardId={thumbnail.cardId} />
      ) : thumbnail?.kind === 'set' && thumbnail.set ? (
        <SetIcon set={thumbnail.set} size="full" />
      ) : (
        <MessagesSquare size={30} strokeWidth={1.4} />
      )}
    </div>
  );
}
