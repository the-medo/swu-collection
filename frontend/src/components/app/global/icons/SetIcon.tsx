import * as React from 'react';
import { cn } from '@/lib/utils.ts';
import { cva, VariantProps } from 'class-variance-authority';

export const setIconVariants = cva('', {
  variants: {
    size: {
      original: 'w-[150px] min-w-[150px]',
      full: 'w-full',
    },
  },
  defaultVariants: {
    size: 'original',
  },
});

export type SetIconVariantProps = VariantProps<typeof setIconVariants>;

type SetIconProps = {
  set: string;
} & SetIconVariantProps;

const SetIcon: React.FC<SetIconProps> = ({ set, ...variants }) => {
  return (
    <div className={cn(setIconVariants({ ...variants }), 'bg-black rounded-lg p-2')}>
      <img src={`https://images.swubase.com/logos/${set.toLowerCase()}.png`} alt={set} />
    </div>
  );
};

export default SetIcon;
