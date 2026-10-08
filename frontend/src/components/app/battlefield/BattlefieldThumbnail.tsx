import type { BattlefieldItem } from '../../../../../shared/battlefield/catalog.ts';
import { BattlefieldArt } from './BattlefieldArt';
import type { BattlefieldPlanetTextureId } from '../../../../../shared/battlefield/planets.ts';

// Fit the catalog's native dimensions into a preview instead of stretching the
// art to the card's dimensions.
export function BattlefieldThumbnail({
  item,
  color,
  textureId,
  className = 'h-14 w-24',
}: {
  item: BattlefieldItem;
  color?: string;
  textureId?: BattlefieldPlanetTextureId;
  className?: string;
}) {
  const width = item.width ?? 120,
    height = item.height ?? 120;
  return (
    <svg
      viewBox={`${-width / 2} ${-height / 2} ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      overflow="hidden"
      className={className}
      aria-hidden="true"
    >
      <BattlefieldArt
        item={item}
        color={color}
        textureId={textureId}
        frame={{ x: -width / 2, y: -height / 2, width, height }}
      />
    </svg>
  );
}
