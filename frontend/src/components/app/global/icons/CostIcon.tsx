import * as React from 'react';
import { IconVariantProps, iconVariants } from '@/components/app/global/icons/iconLib.ts';
import { cn } from '@/lib/utils.ts';

type CostIconProps = {
  cost?: number | string;
  textSize?: 'default' | 'small';
} & IconVariantProps;

const CostIcon: React.FC<CostIconProps> = ({ cost, textSize = 'default', ...variants }) => {
  return (
    <div className={cn(iconVariants({ ...variants }), 'relative')}>
      <img
        className="w-full h-full absolute top-0 left-0"
        src={`https://images.swubase.com/icons/cost.webp`}
        alt={`${cost}-cost`}
      />
      {cost !== undefined && (
        <>
          <span
            className={cn(
              'absolute text-[18px] font-medium top-[50%] left-[50%] text-[white] [text-shadow:1px_1px_0_#000,-1px_-1px_0_#000,1px_-1px_0_#000,-1px_1px_0_#000] transform -translate-x-1/2 -translate-y-1/2',
              {
                'text-[16px]': variants.size === 'small',
              },
            )}
          >
            {cost}
          </span>
        </>
      )}
    </div>
  );
};

export default CostIcon;
