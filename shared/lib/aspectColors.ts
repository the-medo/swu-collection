import { SwuAspect } from '../../types/enums.ts';

export const aspectColors: Record<SwuAspect, string> = {
  [SwuAspect.VIGILANCE]: '#6694ce', // c61 m34 y0 k0
  [SwuAspect.COMMAND]: '#41ad49', // c75 m5 y100 k0
  [SwuAspect.AGGRESSION]: '#d2232a', // c15 m100 y100 k0
  [SwuAspect.CUNNING]: '#fdb933', // c0 m30 y90 k0
  [SwuAspect.HEROISM]: '#c6c1a0', // c18 m14 y36 k6
  [SwuAspect.VILLAINY]: '#040004', // c50 m80 y0 k100
};
