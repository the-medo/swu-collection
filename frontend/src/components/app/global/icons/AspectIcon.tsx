import * as React from 'react';
import { IconVariantProps, iconVariants } from '@/components/app/global/icons/iconLib.ts';
import { cn } from '@/lib/utils.ts';

type AspectIconProps = {
  aspect: string;
} & IconVariantProps;

const AspectIcon: React.FC<AspectIconProps> = ({ aspect, ...variants }) => {
  const aspectIcon = aspect.toLowerCase();

  return (
    <img
      className={cn(iconVariants({ ...variants }))}
      src={`https://images.swubase.com/icons/${aspectIcon}.webp`}
      alt={aspect}
    />
  );
};

export default AspectIcon;
