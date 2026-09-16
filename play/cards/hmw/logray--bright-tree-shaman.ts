import { hmwUnit } from './define.ts';

export const hmwLograyBrightTreeShaman = hmwUnit('logray--bright-tree-shaman', {
  triggers: [
    {
      id: 'friendly-damaged',
      timing: 'friendly-unit-damage',
      condition: {
        kind: 'unit-matches',
        target: 'subject',
        filter: {
          controller: 'friendly',
          otherThan: 'source',
          maxCost: 3,
        },
      },
      effects: [
        {
          kind: 'damage-unit',
          amount: 1,
          arena: 'any',
          controller: 'enemy',
          optional: true,
        },
      ],
    },
  ],
});
