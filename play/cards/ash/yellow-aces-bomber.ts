import type { UnitDefinition } from '../definition.ts';

// ASH 253. Printed text is pinned in meta-board fixture.
export const yellowAcesBomber = {
  cardId: 'yellow-aces-bomber',
  name: 'Yellow Aces Bomber',
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['New Republic', 'Vehicle', 'Fighter'],
  cost: 3,
  power: 2,
  hp: 4,
  arena: 'space',
  keywords: ['Support'],
  triggers: [
    {
      id: 'on-attack',
      timing: 'attack',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'unit-matches',
            target: 'source',
            filter: {
              upgraded: true,
            },
          },
          effects: [
            {
              kind: 'damage-base',
              amount: 2,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
