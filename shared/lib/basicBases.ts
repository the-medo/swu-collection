import { SwuAspect } from '../../types/enums.ts';

export const basicBases: Record<string, true | undefined> = {
  'capital-city': true, // vigilance
  'command-center': true, // command
  'catacombs-of-cadera': true, // aggression
  'administrator-s-tower': true, // cunning
};

export const basicBaseForAspect: Record<SwuAspect, string> = {
  [SwuAspect.VIGILANCE]: 'capital-city',
  [SwuAspect.COMMAND]: 'command-center',
  [SwuAspect.AGGRESSION]: 'catacombs-of-cadera',
  [SwuAspect.CUNNING]: 'administrator-s-tower',
  [SwuAspect.HEROISM]: '',
  [SwuAspect.VILLAINY]: '',
};
