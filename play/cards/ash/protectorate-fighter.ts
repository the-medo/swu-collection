import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 token/effect fixture.
export const protectorateFighter = {
  cardId: 'protectorate-fighter',
  name: 'Protectorate Fighter',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Mandalorian', 'Vehicle', 'Fighter'],
  cost: 3,
  power: 2,
  hp: 1,
  arena: 'space',
  triggers: [
    {
      id: 'mandalorian',
      timing: 'played',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'units-at-least',
            filter: {
              controller: 'friendly',
              unique: true,
            },
            amount: 1,
          },
          effects: [
            {
              kind: 'create-unit',
              cardId: 'mandalorian',
              count: 1,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
