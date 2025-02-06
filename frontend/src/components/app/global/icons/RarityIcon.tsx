import * as React from 'react';
import { IconVariantProps, iconVariants } from '@/components/app/global/icons/iconLib.ts';
import { cn } from '@/lib/utils.ts';

type RarityIconProps = {
  rarity: string;
} & IconVariantProps;

const RarityIcon: React.FC<RarityIconProps> = ({ rarity, ...variants }) => {
  const rarityIcon = rarity.toLowerCase();

  return (
    <img
      className={cn(iconVariants({ ...variants }))}
      src={`https://images.swubase.com/icons/${rarityIcon}.webp`}
      alt={rarity}
    />
  );
};

export default RarityIcon;
