import { useRef, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { useInView } from 'motion/react';
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
  fit?: 'contain' | 'cover';
  loading?: 'eager' | 'lazy';
};

/** Measured artwork windows, using leader backs and other card fronts.
 * Portrait cards and events share a ratio; bases retain their wider artwork.
 */
export default function CardArtCrop({
  card,
  cardVariantId,
  className,
  alt = card.name,
  fit = 'contain',
  loading = 'eager',
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
      fit={fit}
      loading={loading}
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
  fit,
  loading,
}: {
  src?: string;
  width: number;
  height: number;
  cropWidth: number;
  cropHeight: number;
  viewBox: string;
  alt: string;
  className?: string;
  fit: 'contain' | 'cover';
  loading: 'eager' | 'lazy';
}) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, margin: '200px' });
  const unavailable = !src || failed;
  return (
    <svg
      ref={loading === 'lazy' ? ref : undefined}
      role="img"
      aria-label={unavailable ? `${alt}: artwork unavailable` : alt}
      viewBox={unavailable ? `0 0 ${cropWidth} ${cropHeight}` : viewBox}
      width={cropWidth}
      height={cropHeight}
      preserveAspectRatio={fit === 'cover' ? 'xMidYMid slice' : 'xMidYMid meet'}
      className={cn('block h-auto w-full overflow-hidden', className)}
    >
      {unavailable ? (
        <>
          <rect width={cropWidth} height={cropHeight} className="fill-muted" />
          <ImageOff
            x={(cropWidth - 20) / 2}
            y={(cropHeight - 20) / 2}
            width={20}
            height={20}
            className="text-muted-foreground"
            aria-hidden="true"
          />
        </>
      ) : (
        <image
          href={loading === 'eager' || inView ? src : undefined}
          width={width}
          height={height}
          preserveAspectRatio="xMinYMin meet"
          onError={() => setFailed(true)}
        />
      )}
    </svg>
  );
}
