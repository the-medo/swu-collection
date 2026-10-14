import CardImage from '@/components/app/global/CardImage.tsx';
import { cn } from '@/lib/utils.ts';
import type { CardPrinting } from '../../../../../../shared/lib/cardGroupPrintings.ts';

const positions = [
  'left-[26%] top-0 -rotate-[16deg] z-10',
  'left-[42%] -top-[12%] -rotate-6 z-20',
  'left-[58%] -top-[12%] rotate-6 z-30',
  'left-[74%] top-0 rotate-[16deg] z-40',
];

const hoverPositions = [
  'group-hover/promo-tile:left-[24%] group-hover/promo-tile:-rotate-[20deg] group-focus-visible/promo-tile:left-[24%] group-focus-visible/promo-tile:-rotate-[20deg]',
  'group-hover/promo-tile:left-[40%] group-hover/promo-tile:-rotate-[8deg] group-focus-visible/promo-tile:left-[40%] group-focus-visible/promo-tile:-rotate-[8deg]',
  'group-hover/promo-tile:left-[60%] group-hover/promo-tile:rotate-[8deg] group-focus-visible/promo-tile:left-[60%] group-focus-visible/promo-tile:rotate-[8deg]',
  'group-hover/promo-tile:left-[76%] group-hover/promo-tile:rotate-[20deg] group-focus-visible/promo-tile:left-[76%] group-focus-visible/promo-tile:rotate-[20deg]',
];

export default function PromoCardFan({
  printings,
  loading = 'lazy',
  className,
  spreadOnHover = false,
}: {
  printings: CardPrinting[];
  loading?: 'eager' | 'lazy';
  className?: string;
  spreadOnHover?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none relative mx-auto aspect-[5/3] w-full max-w-md',
        className,
      )}
    >
      {printings.slice(0, 4).map(({ card, variant }, index) => (
        <div
          key={variant.variantId}
          className={cn(
            'absolute w-[42%] -translate-x-1/2 rounded-lg shadow-xl shadow-black/50',
            positions[index],
            spreadOnHover &&
              'transition-[left,rotate] duration-300 ease-out motion-reduce:transition-none',
            spreadOnHover && hoverPositions[index],
          )}
        >
          <CardImage
            card={card}
            cardVariantId={variant.variantId}
            size="responsive"
            backSideButton={false}
            loading={loading}
          />
        </div>
      ))}
    </div>
  );
}
