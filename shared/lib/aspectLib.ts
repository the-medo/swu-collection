import { SwuAspect } from '../../types/enums.ts';

export const aspectLib: Record<SwuAspect, string> = {
  [SwuAspect.VIGILANCE]: '#6694ce', // c61 m34 y0 k0
  [SwuAspect.COMMAND]: '#41ad49', // c75 m5 y100 k0
  [SwuAspect.AGGRESSION]: '#d2232a', // c15 m100 y100 k0
  [SwuAspect.CUNNING]: '#fdb933', // c0 m30 y90 k0
  [SwuAspect.HEROISM]: '#c6c1a0', // c18 m14 y36 k6
  [SwuAspect.VILLAINY]: '#040004', // c50 m80 y0 k100
};

export const aspectSortValue: Record<SwuAspect, number> = {
  [SwuAspect.VIGILANCE]: 1,
  [SwuAspect.COMMAND]: 2,
  [SwuAspect.AGGRESSION]: 3,
  [SwuAspect.CUNNING]: 4,
  [SwuAspect.HEROISM]: 5,
  [SwuAspect.VILLAINY]: 6,
};

export function sortByAspectArrays(aspectsA: SwuAspect[], aspectsB: SwuAspect[]) {
  const maxLength = Math.max(aspectsA.length, aspectsB.length);

  for (let i = 0; i < maxLength; i++) {
    const sortValueA = aspectSortValue[aspectsA[i]] ?? 10;
    const sortValueB = aspectSortValue[aspectsB[i]] ?? 10;

    if (sortValueA !== sortValueB) {
      return sortValueA - sortValueB;
    }
  }

  return 0;
}

export function getAspectGradient(aspects?: SwuAspect[]) {
  const unique = Array.from(new Set((aspects ?? []).filter(Boolean)));
  const colors = unique.map(a => aspectLib[a]).filter(Boolean);

  if (colors.length === 0) return undefined;
  if (colors.length === 1) return colors[0]; // solid fallback
  return `linear-gradient(135deg, ${colors.join(', ')})`;
}
