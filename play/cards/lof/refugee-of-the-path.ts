import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const refugeeOfThePath = {
  cardId: 'refugee-of-the-path',
  name: 'Refugee of The Path',
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['Force', 'Fringe'],
  cost: 1,
  power: 0,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'when-played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            hasKeyword: 'Sentinel',
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'give-token',
                token: 'shield',
                count: 1,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
