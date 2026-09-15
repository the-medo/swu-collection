import type { EventDefinition } from '../definition.ts';

// JTL 131. Printed text is pinned in meta-board fixture.
export const turbolaserSalvo = {
  cardId: 'turbolaser-salvo',
  name: 'Turbolaser Salvo',
  kind: 'event',
  aspects: ['Command'],
  traits: ['Tactic'],
  cost: 7,
  effects: [
    {
      kind: 'choose-mode',
      options: [
        {
          id: 'ground',
          effects: [
            {
              kind: 'select-unit',
              bind: 'gunner',
              filter: {
                controller: 'friendly',
                arena: 'space',
              },
              optional: false,
              effects: [
                {
                  kind: 'damage-units',
                  amount: {
                    kind: 'unit-stat',
                    target: 'gunner',
                    stat: 'power',
                  },
                  source: 'gunner',
                  filter: {
                    controller: 'enemy',
                    arena: 'ground',
                  },
                },
              ],
            },
          ],
        },
        {
          id: 'space',
          effects: [
            {
              kind: 'select-unit',
              bind: 'gunner',
              filter: {
                controller: 'friendly',
                arena: 'space',
              },
              optional: false,
              effects: [
                {
                  kind: 'damage-units',
                  amount: {
                    kind: 'unit-stat',
                    target: 'gunner',
                    stat: 'power',
                  },
                  source: 'gunner',
                  filter: {
                    controller: 'enemy',
                    arena: 'space',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
