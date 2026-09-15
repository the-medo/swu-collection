import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const stingerMantisWhereAreWeGoing = {
  cardId: 'stinger-mantis--where-are-we-going-',
  name: 'Stinger Mantis, Where Are We Going?',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Fringe', 'Vehicle', 'Transport'],
  unique: true,
  cost: 5,
  power: 4,
  hp: 6,
  arena: 'space',
  triggers: [
    {
      id: 'when-played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            exhausted: true,
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'damage',
                amount: 2,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
