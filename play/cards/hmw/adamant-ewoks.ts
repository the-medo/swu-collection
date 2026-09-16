import { hmwUnit } from './define.ts';

export const hmwAdamantEwoks = hmwUnit('adamant-ewoks', {
  triggers: [
    {
      id: 'played',
      timing: 'played',
      condition: {
        kind: 'any',
        conditions: [
          {
            kind: 'units-at-least',
            filter: {
              controller: 'friendly',
              trait: 'Ewok',
              otherThan: 'source',
            },
            amount: 1,
          },
          {
            kind: 'controls-base-trait',
            trait: 'Endor',
          },
        ],
      },
      effects: [
        {
          kind: 'select-target',
          bases: 'any',
          bind: 'base',
          optional: true,
          effects: [
            {
              kind: 'damage-target',
              target: 'base',
              amount: 1,
            },
            {
              kind: 'damage-unit',
              amount: 1,
              arena: 'any',
              controller: 'enemy',
              optional: false,
            },
          ],
        },
      ],
    },
  ],
});
