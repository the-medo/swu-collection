import { cva } from 'class-variance-authority';
import { Layers3 } from 'lucide-react';
import { useCardList } from '@/api/lists/useCardList.ts';
import { getCardImageUrl } from '@/components/app/global/cardImageLib.ts';
import { cn } from '@/lib/utils.ts';
import { selectDefaultVariant } from '../../../../../server/lib/cards/selectDefaultVariant.ts';

type DeckArtworkSize = 'default' | 'compact' | 'mini';

const artworkVariants = cva(
  'deck-artwork compact-deck-art group/deck-art relative grid flex-none place-items-center text-muted-foreground',
  {
    variants: {
      size: {
        default:
          'w-34 h-11 data-[triple=true]:w-42 max-phone:w-25 max-phone:data-[triple=true]:w-32.5',
        compact: 'w-23 h-8 data-[triple=true]:w-27.5',
        mini: 'w-34 basis-20 h-9 @max-[700.01px]:basis-16.5 @max-[560.01px]:basis-auto @max-[560.01px]:w-16.5 @max-[560.01px]:h-8.5',
      },
    },
  },
);

const deckCardVariants = cva(
  cn(
    'compact-deck-card absolute top-1/2 aspect-[1.4] border border-[#ffffff30] object-contain',
    'shadow-[0_4px_8px_#111b142b] transition-transform duration-160 ease-[ease] motion-reduce:transition-none',
  ),
  {
    variants: {
      size: {
        default: 'w-25.5 rounded-[5px] max-phone:w-19.5',
        compact: 'w-18.5 rounded-[3px]',
        mini: 'w-15.5 rounded-[5px] @max-[700.01px]:w-13',
      },
      role: {
        leader: cn(
          'compact-deck-card-leader left-0 z-1 [transform:translateY(-50%)_rotate(-5deg)]',
          '[tr:hover_&]:[transform:translate(-3px,-50%)_rotate(-8deg)]',
          'group-hover/deck-art:[transform:translate(-3px,-50%)_rotate(-8deg)]',
          'group-hover/deck-row:[transform:translate(-3px,-50%)_rotate(-8deg)]',
          'group-focus-within/deck-row:[transform:translate(-3px,-50%)_rotate(-8deg)]',
        ),
        leader2: 'compact-deck-card-leader2 z-1 [transform:translateY(-50%)_rotate(1deg)]',
        base: cn(
          'compact-deck-card-base right-0 [transform:translateY(-50%)_rotate(7deg)]',
          '[tr:hover_&]:[transform:translate(3px,-50%)_rotate(10deg)]',
          'group-hover/deck-art:[transform:translate(3px,-50%)_rotate(10deg)]',
          'group-hover/deck-row:[transform:translate(3px,-50%)_rotate(10deg)]',
          'group-focus-within/deck-row:[transform:translate(3px,-50%)_rotate(10deg)]',
        ),
      },
    },
    compoundVariants: [
      {
        role: 'leader2',
        size: ['default', 'mini'],
        className: 'left-[33px] max-phone:left-[25px]',
      },
      { role: 'leader2', size: 'compact', className: 'left-[23px]' },
    ],
  },
);

/** Full leader/base cards, shared by homepage rows, deck tables and limited pools. */
export function DeckArtwork({
  leaderId,
  leader2Id,
  baseId,
  size = 'default',
}: {
  leaderId?: string | null;
  leader2Id?: string | null;
  baseId?: string | null;
  size?: DeckArtworkSize;
}) {
  const { data } = useCardList();
  const images = [
    { id: leaderId, kind: 'leader' },
    { id: leader2Id, kind: 'leader2' },
    { id: baseId, kind: 'base' },
  ].flatMap(({ id, kind }) => {
    const card = id ? data?.cards[id] : undefined;
    const variant = card ? selectDefaultVariant(card) : undefined;
    const src = getCardImageUrl(card?.variants[variant ?? '']?.image.front);
    return src ? [{ src, kind, name: card?.name ?? kind }] : [];
  });

  return (
    <div
      className={artworkVariants({ size })}
      role="img"
      aria-label={images.map(image => image.name).join(' / ') || 'No leader or base selected'}
      data-single={images.length === 1}
      data-triple={images.length === 3}
    >
      {images.length ? (
        images.map(({ src, kind }, index) => (
          <img
            key={kind}
            className={cn(
              deckCardVariants({
                size,
                role:
                  kind === 'leader' || (kind === 'leader2' && index === 0)
                    ? 'leader'
                    : kind === 'leader2'
                      ? 'leader2'
                      : 'base',
              }),
              images.length === 3 && index === 0 && 'z-2',
              images.length === 1 && 'left-3 right-auto',
            )}
            src={src}
            alt=""
            loading="lazy"
          />
        ))
      ) : (
        <Layers3 size={26} strokeWidth={1.4} aria-hidden="true" />
      )}
    </div>
  );
}
