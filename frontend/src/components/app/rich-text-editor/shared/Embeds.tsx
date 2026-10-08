import { useNavigate } from '@tanstack/react-router';
import { getCardDetailDialogSearch } from '@/components/app/cards/CardDetail/cardDetailSearchParams.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import { useSession } from '@/lib/auth-client.ts';
import { getCardImageUrl } from '@/components/app/global/cardImageLib.ts';
import DeckCardHoverImage from '@/components/app/decks/DeckContents/DeckCards/DeckLayout/DeckCardHoverImage.tsx';
import DeckDetail from '@/components/app/decks/DeckDetail/DeckDetail.tsx';
import { selectDefaultVariant } from '../../../../../../server/lib/cards/selectDefaultVariant.ts';
import { cardHref, type CardReference, type CardSize, type DeckReference } from './model.ts';

export function CardLink({ card }: { card: CardReference }) {
  const catalog = useCardList();
  const navigate = useNavigate();
  return (
    <DeckCardHoverImage
      card={catalog.data?.cards[card.cardId]}
      defaultVariantId={card.variantId || undefined}
    >
      <a
        className="rte-card-link"
        href={cardHref(card.cardId)}
        onClick={event => {
          if (
            event.button !== 0 ||
            event.ctrlKey ||
            event.metaKey ||
            event.shiftKey ||
            event.altKey
          )
            return;
          event.preventDefault();
          void navigate({
            to: '.',
            search: (previous: Record<string, unknown>) =>
              getCardDetailDialogSearch(previous, card.cardId),
          });
        }}
      >
        {card.name}
      </a>
    </DeckCardHoverImage>
  );
}

export function CardArtwork({ card, size = 'medium' }: { card: CardReference; size?: CardSize }) {
  const catalog = useCardList();
  const current = catalog.data?.cards[card.cardId];
  const variant = current?.variants[card.variantId || selectDefaultVariant(current) || ''];
  const image = getCardImageUrl(variant?.image.front);
  return (
    <figure className="rte-card-artwork" data-card-id={card.cardId} data-card-size={size}>
      {image ? (
        <img src={image} alt={card.name} loading="lazy" draggable={false} />
      ) : (
        <div className="rounded-lg bg-muted p-6 text-sm">
          {catalog.isPending ? 'Loading card…' : 'Artwork unavailable'}
        </div>
      )}
      <figcaption>
        <CardLink card={card} />
      </figcaption>
    </figure>
  );
}

export function DecklistEmbed({ deck }: { deck: DeckReference }) {
  const session = useSession();
  return (
    <section className="rte-decklist" data-deck-id={deck.deckId} aria-label="Deck detail">
      {session.isPending ? (
        <p role="status">Loading account…</p>
      ) : (
        <DeckDetail
          key={`${session.data?.session.id ?? 'anonymous'}:${deck.deckId}`}
          deckId={deck.deckId}
          embedded
        />
      )}
    </section>
  );
}
