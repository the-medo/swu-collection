import { hmwUnit } from './define.ts';

export const hmwVernestraRwohWeShouldHandleThisOurselves = hmwUnit(
  'vernestra-rwoh--we-should-handle-this-ourselves',
  {
    keywords: ['Sentinel'],
    bottomDiscardForPlayedAbilities: { max: 2, maxCost: 5 },
  },
);
