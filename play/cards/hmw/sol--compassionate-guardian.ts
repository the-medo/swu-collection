import { hmwUnit } from './define.ts';

export const hmwSolCompassionateGuardian = hmwUnit('sol--compassionate-guardian', {
  keywords: ['Shielded'],
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'on-unit',
          target: 'source',
          operation: {
            kind: 'modify',
            power: 0,
            hp: 0,
            abilities: {
              keywords: ['Sentinel'],
            },
            duration: 'phase',
          },
        },
      ],
    },
  ],
});
