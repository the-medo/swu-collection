import { SwuSet } from '../../../types/enums.ts';

export type SetCardPoolInfo = {
  hasPrerelease: boolean;
  prereleaseLeadersId: string[];
};

export const cardPoolInfo: Partial<Record<SwuSet, SetCardPoolInfo>> = {
  [SwuSet.SEC]: {
    hasPrerelease: true,
    prereleaseLeadersId: [
      'padm--amidala--what-do-you-have-to-hide-',
      'chancellor-palpatine--how-liberty-dies',
    ],
  },
};
