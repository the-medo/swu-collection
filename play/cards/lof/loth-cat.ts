import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const lothCat = {
  cardId: 'loth-cat',
  name: 'Loth-Cat',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Creature'],
  cost: 2,
  power: 2,
  hp: 1,
  arena: 'ground',
  triggers: [
    {
      id: 'when-played',
      timing: 'played',
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
    {
      id: 'when-defeated',
      timing: 'defeated',
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
} as const satisfies UnitDefinition;
