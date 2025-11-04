import * as React from 'react';
import { cn } from '@/lib/utils.ts';
import { cva, VariantProps } from 'class-variance-authority';

export const setIconVariants = cva('', {
  variants: {
    size: {
      original: 'h-[32px] w-[150px] min-h-[32px] min-w-[150px]',
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
    <img
      className={cn(setIconVariants({ ...variants }))}
      src={`https://images.swubase.com/logos/${set.toLowerCase()}.png`}
      alt={set}
    />
  );
};

export default SetIcon;
