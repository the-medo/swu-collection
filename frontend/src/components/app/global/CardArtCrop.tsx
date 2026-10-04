import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils.ts';
import { getCardImageUrl } from './cardImageLib.ts';
import { getCardArtRegion, portraitArtRegion } from './cardArtCropLib.ts';
import { selectDefaultVariant } from '../../../../../server/lib/cards/selectDefaultVariant.ts';
import type {
  CardDataWithVariants,
  CardListVariants,
} from '../../../../../lib/swu-resources/types.ts';

type CardArtCropProps = {
  card: CardDataWithVariants<CardListVariants>;
  cardVariantId?: string;
  className?: string;
  alt?: string;
};

/** Measured artwork windows, using leader backs and other card fronts.
 * Portrait cards and events share a ratio; bases retain their wider artwork.
 */
export default function CardArtCrop({
  card,
  cardVariantId,
  className,
  alt = card.name,
}: CardArtCropProps) {
  const variantId = cardVariantId ?? selectDefaultVariant(card);
  const variant = card.variants[variantId ?? ''];
  const side = card.type === 'Leader' ? 'back' : 'front';
  const horizontal = variant?.[side]?.horizontal ?? card[side]?.horizontal ?? false;
  // Fit to the canonical width without stretching 418px/419px portrait sources.
  // The extra height is outside every artwork window.
  const width = horizontal ? 418 : 300;
  const height = horizontal ? 300 : 420;
  const region = getCardArtRegion(card.type, horizontal);
  const src = region ? getCardImageUrl(variant?.image[side]) : undefined;
  const crop = region ?? portraitArtRegion;
  const viewBox = `${crop.x} ${crop.y} ${crop.width} ${crop.height}`;

  return (
    <ArtworkImage
      key={src ?? 'unavailable'}
      src={src}
      width={width}
      height={height}
      cropWidth={crop.width}
      cropHeight={crop.height}
      viewBox={viewBox}
      alt={alt}
      className={className}
    />
  );
}

function ArtworkImage({
  src,
  width,
  height,
  cropWidth,
  cropHeight,
  viewBox,
  alt,
  className,
}: {
  src?: string;
  width: number;
  height: number;
  cropWidth: number;
  cropHeight: number;
  viewBox: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <span
        role="img"
        aria-label={`${alt}: artwork unavailable`}
        className={cn(
          'flex size-full items-center justify-center bg-muted text-muted-foreground',
          className,
        )}
      >
        <ImageOff className="size-5" aria-hidden="true" />
      </span>
    );
  }
  return (
    <svg
      role="img"
      aria-label={alt}
      viewBox={viewBox}
      width={cropWidth}
      height={cropHeight}
      preserveAspectRatio="xMidYMid meet"
      className={cn('block h-auto w-full overflow-hidden', className)}
    >
      <image
        href={src}
        width={width}
        height={height}
        preserveAspectRatio="xMinYMin meet"
        onError={() => setFailed(true)}
      />
    </svg>
  );
}
