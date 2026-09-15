import { useCardList } from '@/api/lists/useCardList.ts';
import { getCardImageUrl } from '@/components/app/global/cardImageLib.ts';
import { selectDefaultVariant } from '../../../../../server/lib/cards/selectDefaultVariant.ts';

/** Render only the pregame identities the server chose to disclose. */
export function InvitationPortraits({ leaderId, baseId }: { leaderId?: string; baseId?: string }) {
  const { data } = useCardList();
  if (!leaderId && !baseId) return null;
  return (
    <div className="cf-invite-portraits">
      {[leaderId, baseId].map((id, n) => {
        const card = id ? data?.cards[id] : undefined;
        const variant = card && selectDefaultVariant(card);
        const src =
          variant && card ? getCardImageUrl(card.variants[variant]?.image?.front) : undefined;
        return src ? (
          <img key={n} src={src} alt={card?.name ?? (n ? 'Base' : 'Leader')} draggable={false} />
        ) : null;
      })}
    </div>
  );
}
