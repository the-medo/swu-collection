import { cva, VariantProps } from 'class-variance-authority';

export const iconVariants = cva('', {
  variants: {
    size: {
      original: 'h-[32px] w-[32px] min-h-[32px] min-w-[32px]',
      medium: 'h-[26px] w-[26px] min-h-[26px] min-w-[26px]',
      small: 'h-[20px] w-[20px] min-h-[20px] min-w-[20px]',
      xSmall: 'h-[16px] w-[16px] min-h-[16px] min-w-[16px]',
    },
  },
  defaultVariants: {
    size: 'original',
  },
});

export type IconVariantProps = VariantProps<typeof iconVariants>;
