import { hmwUnit } from './define.ts';

export const hmwBobaFettFamilyFound = hmwUnit('boba-fett--family-found', {
  keywords: ['Ambush'],
  triggers: [
    {
      id: 'ambush-enters',
      timing: 'friendly-entered',
      condition: {
        kind: 'unit-matches',
        target: 'subject',
        filter: {
          controller: 'friendly',
          hasKeyword: 'Ambush',
        },
      },
      effects: [
        {
          kind: 'on-unit',
          target: 'subject',
          operation: {
            kind: 'modify',
            power: 0,
            hp: 0,
            abilities: {
              raid: 1,
              keywords: ['Saboteur'],
            },
            duration: 'phase',
          },
        },
      ],
    },
  ],
});
