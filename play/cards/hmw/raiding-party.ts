import { hmwUnit } from './define.ts';

export const hmwRaidingParty = hmwUnit('raiding-party', {
  raid: 6,
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
              trait: 'Tusken',
              otherThan: 'source',
            },
            amount: 1,
          },
          {
            kind: 'controls-base-trait',
            trait: 'Tatooine',
          },
        ],
      },
      effects: [
        {
          kind: 'select-unit',
          filter: {
            arena: 'ground',
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'exhaust',
              },
            },
          ],
        },
      ],
    },
  ],
});
