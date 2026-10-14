import type { CardPrinting } from '../../../../../../shared/lib/cardGroupPrintings.ts';
import { getCardImageUrl } from '@/components/app/global/cardImageLib.ts';
import { cn } from '@/lib/utils.ts';

const positions = [
  '-translate-x-[86%] translate-y-4 -rotate-[15deg] z-10',
  '-translate-x-1/2 -translate-y-1 z-20',
  '-translate-x-[14%] translate-y-4 rotate-[15deg] z-10',
];

export default function CardFan({ printings }: { printings: CardPrinting[] }) {
  return (
    <div aria-hidden="true" className="relative mx-auto h-52 w-full max-w-sm overflow-hidden pt-7">
      {printings.slice(0, 3).map(({ card, variant }, index) => (
        <img
          key={variant.variantId}
          src={getCardImageUrl(
            card.type === 'Leader' && variant.image.back ? variant.image.back : variant.image.front,
          )}
          alt=""
          loading="lazy"
          className={cn(
            'absolute left-1/2 top-7 w-32 rounded-lg shadow-xl transition-transform duration-300 motion-reduce:transition-none group-hover:-translate-y-1',
            positions[index],
          )}
        />
      ))}
    </div>
  );
}
