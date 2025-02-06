import * as React from 'react';
import { IconVariantProps, iconVariants } from '@/components/app/global/icons/iconLib.ts';
import { cn } from '@/lib/utils.ts';

type CostIconProps = {
  cost?: number;
} & IconVariantProps;

const CostIcon: React.FC<CostIconProps> = ({ cost, ...variants }) => {
  return (
    <div className={cn(iconVariants({ ...variants }), 'relative')}>
      <img
        className="w-full h-full absolute top-0 left-0"
        src={`https://images.swubase.com/icons/cost.webp`}
        alt={`${cost}-cost`}
      />
      {cost !== undefined && (
        <>
          <span className="absolute text-lg  font-medium top-[50%] left-[50%] text-white transform -translate-x-1/2 -translate-y-1/2">
            {cost}
          </span>
        </>
      )}
    </div>
  );
};

export default CostIcon;
