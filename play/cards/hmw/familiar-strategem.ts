import { hmwEvent } from './define.ts';

export const hmwFamiliarStrategem = hmwEvent('familiar-strategem', [
  {
    kind: 'select-unit',
    filter: {
      controller: 'friendly',
    },
    bind: 'chosen',
    optional: false,
    effects: [
      {
        kind: 'attack-bound',
        target: 'chosen',
        optional: false,
        powerBonus: {
          kind: 'conditional',
          condition: {
            kind: 'units-at-least',
            filter: {
              controller: 'friendly',
              otherThan: 'chosen',
              sharesTraitWith: 'chosen',
            },
            amount: 1,
          },
          then: 2,
          otherwise: 0,
        },
      },
    ],
    forAttack: {},
  },
]);
