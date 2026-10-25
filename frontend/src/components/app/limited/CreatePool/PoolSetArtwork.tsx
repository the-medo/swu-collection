import { limitedStyles } from '@/components/app/limited/limitedStyles';
import { useMemo } from 'react';
import { useCardList } from '@/api/lists/useCardList.ts';
import CardArtCrop from '@/components/app/global/CardArtCrop.tsx';

export default function PoolSetArtwork({ set }: { set: string }) {
  const { data } = useCardList();
  const leaders = useMemo(() => {
    const printings = Object.values(data?.cards ?? {}).flatMap(card => {
      if (card.type !== 'Leader') return [];
      const variant = Object.values(card.variants).find(
        variant => variant.set === set && variant.variantName === 'Standard',
      );
      return variant ? [{ card, variant }] : [];
    });
    return [0, Math.floor(printings.length / 2), printings.length - 1]
      .filter((index, position, indices) => indices.indexOf(index) === position)
      .flatMap(index => (printings[index] ? [printings[index]] : []));
  }, [data, set]);

  return (
    <div className={limitedStyles.setArt} aria-hidden="true">
      {leaders.map(({ card, variant }) => (
        <CardArtCrop
          key={variant.variantId}
          card={card}
          cardVariantId={variant.variantId}
          alt=""
          fit="cover"
        />
      ))}
    </div>
  );
}
