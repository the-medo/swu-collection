import { hmwLeader } from './define.ts';

const fortify = {
  ignoreAspectPenalties: [
    { filter: { kind: 'upgrade' as const, printedKeyword: 'Fortify' as const } },
  ],
};

export const hmwGrandMoffTarkinTyrantOfTheOuterRim = hmwLeader(
  'grand-moff-tarkin--tyrant-of-the-outer-rim',
  {
    leader: fortify,
    unit: {
      ...fortify,
      triggers: [
        {
          id: 'regroup',
          timing: 'regroup-start',
          effects: [
            {
              kind: 'select-target',
              bases: 'any',
              baseRemainingHpAtMost: 10,
              bind: 'base',
              optional: true,
              effects: [{ kind: 'defeat-target', target: 'base' }],
            },
          ],
        },
      ],
    },
  },
);
